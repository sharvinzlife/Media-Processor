#!/usr/bin/env python3
"""
Simple MCP Memory Server with ChromaDB
Provides persistent memory capabilities for Claude Code
"""

import os
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence
from datetime import datetime

# Set log level before importing fastmcp
os.environ.setdefault('LOG_LEVEL', 'INFO')

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# Import MCP components
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp import types
from mcp.server.stdio import stdio_server


class SimpleMemoryServer:
    """Simple memory server with semantic search capabilities"""
    
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = os.path.join(str(Path.home()), '.claude', 'memory')
        
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize ChromaDB
        self.client = chromadb.PersistentClient(
            path=str(self.data_dir / 'chroma'),
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Initialize sentence transformer
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="memory",
            metadata={"description": "Claude Code memory storage"}
        )
        
        print(f"Memory server initialized with {self.collection.count()} memories", file=sys.stderr)

# Initialize memory server
memory_server = SimpleMemoryServer()

# Create MCP server
server = Server("simple-memory-server")

@server.list_tools()
async def handle_list_tools() -> List[types.Tool]:
    """List available memory tools"""
    return [
        types.Tool(
            name="remember",
            description="Store information in memory with semantic search",
            inputSchema={
                "type": "object",
                "properties": {
                    "content": {"type": "string", "description": "Information to remember"},
                    "tags": {"type": "array", "items": {"type": "string"}, "description": "Optional tags"},
                    "importance": {"type": "integer", "minimum": 1, "maximum": 10, "default": 5}
                },
                "required": ["content"]
            }
        ),
        types.Tool(
            name="recall",
            description="Search and retrieve memories based on semantic similarity",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "What to search for"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 20, "default": 5},
                    "min_similarity": {"type": "number", "minimum": 0, "maximum": 1, "default": 0.3}
                },
                "required": ["query"]
            }
        ),
        types.Tool(
            name="list_memories",
            description="List stored memories, optionally filtered by tags",
            inputSchema={
                "type": "object",
                "properties": {
                    "tags": {"type": "array", "items": {"type": "string"}, "description": "Filter by tags"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 50, "default": 10}
                },
                "required": []
            }
        ),
        types.Tool(
            name="memory_stats",
            description="Get memory storage statistics",
            inputSchema={"type": "object", "properties": {}, "required": []}
        ),
        types.Tool(
            name="forget",
            description="Delete specific memories",
            inputSchema={
                "type": "object",
                "properties": {
                    "memory_id": {"type": "string", "description": "Specific memory ID to delete"},
                    "query": {"type": "string", "description": "Search query to find and delete memories"}
                },
                "required": []
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[types.TextContent]:
    """Handle tool calls"""
    
    if name == "remember":
        content = arguments["content"]
        tags = arguments.get("tags", [])
        importance = arguments.get("importance", 5)
        
        # Generate embedding
        embedding = memory_server.encoder.encode([content])[0].tolist()
        
        # Create unique ID
        memory_id = f"mem_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(content) % 10000:04d}"
        
        # Store in ChromaDB
        memory_server.collection.add(
            documents=[content],
            embeddings=[embedding],
            metadatas=[{
                "timestamp": datetime.now().isoformat(),
                "tags": json.dumps(tags),
                "importance": importance,
                "type": "user_memory"
            }],
            ids=[memory_id]
        )
        
        result = f"✅ Remembered: {content[:50]}{'...' if len(content) > 50 else ''} (ID: {memory_id})"
        
    elif name == "recall":
        query = arguments["query"]
        limit = arguments.get("limit", 5)
        min_similarity = arguments.get("min_similarity", 0.3)
        
        if memory_server.collection.count() == 0:
            result = "No memories stored yet. Use 'remember' to store information."
        else:
            # Generate query embedding
            query_embedding = memory_server.encoder.encode([query])[0].tolist()
            
            # Search in ChromaDB
            results = memory_server.collection.query(
                query_embeddings=[query_embedding],
                n_results=min(limit, memory_server.collection.count())
            )
            
            if not results['documents'][0]:
                result = f"No memories found for: {query}"
            else:
                # Format results
                formatted_results = []
                for i, (doc, metadata, distance) in enumerate(zip(
                    results['documents'][0],
                    results['metadatas'][0], 
                    results['distances'][0]
                )):
                    similarity = 1 - distance  # Convert distance to similarity
                    if similarity >= min_similarity:
                        tags = json.loads(metadata.get('tags', '[]'))
                        tag_str = f" [{', '.join(tags)}]" if tags else ""
                        importance = metadata.get('importance', 5)
                        timestamp = metadata.get('timestamp', 'Unknown')
                        
                        formatted_results.append(
                            f"{i+1}. {doc}{tag_str}\n"
                            f"   💯 Relevance: {similarity:.2f} | "
                            f"⭐ Importance: {importance}/10 | "
                            f"🕒 {timestamp[:10]}"
                        )
                
                if not formatted_results:
                    result = f"No memories found above similarity threshold {min_similarity} for: {query}"
                else:
                    result = f"🧠 Found {len(formatted_results)} relevant memories for '{query}':\n\n" + "\n\n".join(formatted_results)
    
    elif name == "list_memories":
        tags_filter = arguments.get("tags")
        limit = arguments.get("limit", 10)
        
        if memory_server.collection.count() == 0:
            result = "No memories stored yet."
        else:
            # Get all memories
            results = memory_server.collection.get(limit=limit)
            
            if not results['documents']:
                result = "No memories found."
            else:
                # Filter by tags if provided
                filtered_memories = []
                for i, (doc, metadata, memory_id) in enumerate(zip(
                    results['documents'],
                    results['metadatas'],
                    results['ids']
                )):
                    memory_tags = json.loads(metadata.get('tags', '[]'))
                    if tags_filter is None or any(tag in memory_tags for tag in tags_filter):
                        importance = metadata.get('importance', 5)
                        timestamp = metadata.get('timestamp', 'Unknown')
                        tag_str = f" [{', '.join(memory_tags)}]" if memory_tags else ""
                        
                        filtered_memories.append(
                            f"{len(filtered_memories)+1}. {doc[:80]}{'...' if len(doc) > 80 else ''}{tag_str}\n"
                            f"   ID: {memory_id} | ⭐ {importance}/10 | 🕒 {timestamp[:10]}"
                        )
                
                if not filtered_memories:
                    result = f"No memories found with tags: {tags_filter}"
                else:
                    total_count = memory_server.collection.count()
                    showing = len(filtered_memories)
                    result = f"📚 Showing {showing} of {total_count} memories:\n\n" + "\n\n".join(filtered_memories)
    
    elif name == "memory_stats":
        total_memories = memory_server.collection.count()
        
        if total_memories == 0:
            result = "📊 Memory Statistics:\n- Total memories: 0\n- Storage: Empty"
        else:
            # Get all memories to analyze
            results = memory_server.collection.get()
            
            # Analyze tags
            all_tags = []
            importance_levels = []
            
            for metadata in results['metadatas']:
                tags = json.loads(metadata.get('tags', '[]'))
                all_tags.extend(tags)
                importance_levels.append(metadata.get('importance', 5))
            
            # Count unique tags
            from collections import Counter
            tag_counts = Counter(all_tags)
            avg_importance = sum(importance_levels) / len(importance_levels) if importance_levels else 0
            
            # Format statistics
            stats = [
                f"📊 Memory Statistics:",
                f"- Total memories: {total_memories}",
                f"- Average importance: {avg_importance:.1f}/10",
                f"- Unique tags: {len(tag_counts)}",
                f"- Storage location: {memory_server.data_dir}"
            ]
            
            if tag_counts:
                stats.append(f"- Most used tags: {', '.join([f'{tag}({count})' for tag, count in tag_counts.most_common(5)])}")
            
            result = "\n".join(stats)
    
    elif name == "forget":
        memory_id = arguments.get("memory_id")
        query = arguments.get("query")
        
        if memory_id:
            try:
                memory_server.collection.delete(ids=[memory_id])
                result = f"✅ Forgot memory: {memory_id}"
            except Exception as e:
                result = f"❌ Error forgetting memory {memory_id}: {str(e)}"
        elif query:
            # Search and show what would be deleted
            query_embedding = memory_server.encoder.encode([query])[0].tolist()
            results = memory_server.collection.query(
                query_embeddings=[query_embedding],
                n_results=5
            )
            
            if not results['documents'][0]:
                result = f"No memories found to forget for: {query}"
            else:
                # Delete the most relevant result
                memory_server.collection.delete(ids=[results['ids'][0][0]])
                result = f"✅ Forgot most relevant memory for '{query}': {results['documents'][0][0][:50]}..."
        else:
            result = "❌ Please provide either memory_id or query to forget"
    
    else:
        result = f"Unknown tool: {name}"
    
    return [types.TextContent(type="text", text=result)]

async def main():
    # Run the server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="simple-memory-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=None,
                    experimental_capabilities=None,
                ),
            ),
        )

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())