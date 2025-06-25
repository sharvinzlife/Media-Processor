#!/usr/bin/env python3
"""
MCP Memory Server with ChromaDB
Provides persistent memory capabilities for Claude Code
"""

import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence
from datetime import datetime
import json

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import fastmcp
from mcp.server.models import InitializationOptions
from mcp.types import Resource, Tool, TextContent, ImageContent, EmbeddedResource
from pydantic import AnyUrl


class MemoryServer:
    """Memory server with semantic search capabilities"""
    
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
        
        print(f"Memory server initialized with {self.collection.count()} memories")

# Create FastMCP app
app = fastmcp.FastMCP("Memory Server")
memory_server = MemoryServer()

@app.tool()
def remember(content: str, tags: List[str] = None, importance: int = 5) -> str:
    """
    Store information in memory with semantic search capabilities.
    
    Args:
        content: Information to remember
        tags: Optional tags for organization (e.g., ["project", "deadline"])
        importance: Importance level 1-10 (default: 5)
    
    Returns:
        Success message with memory ID
    """
    if tags is None:
        tags = []
    
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
    
    return f"✅ Remembered: {content[:50]}{'...' if len(content) > 50 else ''} (ID: {memory_id})"

@app.tool()
def recall(query: str, limit: int = 5, min_similarity: float = 0.3) -> str:
    """
    Search and retrieve memories based on semantic similarity.
    
    Args:
        query: What to search for
        limit: Maximum number of results (default: 5)
        min_similarity: Minimum similarity threshold (default: 0.3)
    
    Returns:
        Formatted list of relevant memories
    """
    if memory_server.collection.count() == 0:
        return "No memories stored yet. Use 'remember' to store information."
    
    # Generate query embedding
    query_embedding = memory_server.encoder.encode([query])[0].tolist()
    
    # Search in ChromaDB
    results = memory_server.collection.query(
        query_embeddings=[query_embedding],
        n_results=min(limit, memory_server.collection.count())
    )
    
    if not results['documents'][0]:
        return f"No memories found for: {query}"
    
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
        return f"No memories found above similarity threshold {min_similarity} for: {query}"
    
    return f"🧠 Found {len(formatted_results)} relevant memories for '{query}':\n\n" + "\n\n".join(formatted_results)

@app.tool()
def forget(memory_id: str = None, query: str = None) -> str:
    """
    Delete specific memories.
    
    Args:
        memory_id: Specific memory ID to delete
        query: Search query to find and delete memories
    
    Returns:
        Confirmation message
    """
    if memory_id:
        try:
            memory_server.collection.delete(ids=[memory_id])
            return f"✅ Forgot memory: {memory_id}"
        except Exception as e:
            return f"❌ Error forgetting memory {memory_id}: {str(e)}"
    
    elif query:
        # Search and show what would be deleted
        query_embedding = memory_server.encoder.encode([query])[0].tolist()
        results = memory_server.collection.query(
            query_embeddings=[query_embedding],
            n_results=5
        )
        
        if not results['documents'][0]:
            return f"No memories found to forget for: {query}"
        
        # Delete the most relevant result
        memory_server.collection.delete(ids=[results['ids'][0][0]])
        return f"✅ Forgot most relevant memory for '{query}': {results['documents'][0][0][:50]}..."
    
    else:
        return "❌ Please provide either memory_id or query to forget"

@app.tool()
def list_memories(tags: List[str] = None, limit: int = 10) -> str:
    """
    List stored memories, optionally filtered by tags.
    
    Args:
        tags: Filter by specific tags
        limit: Maximum number of memories to show
    
    Returns:
        Formatted list of memories
    """
    if memory_server.collection.count() == 0:
        return "No memories stored yet."
    
    # Get all memories
    results = memory_server.collection.get(limit=limit)
    
    if not results['documents']:
        return "No memories found."
    
    # Filter by tags if provided
    filtered_memories = []
    for i, (doc, metadata, memory_id) in enumerate(zip(
        results['documents'],
        results['metadatas'],
        results['ids']
    )):
        memory_tags = json.loads(metadata.get('tags', '[]'))
        if tags is None or any(tag in memory_tags for tag in tags):
            importance = metadata.get('importance', 5)
            timestamp = metadata.get('timestamp', 'Unknown')
            tag_str = f" [{', '.join(memory_tags)}]" if memory_tags else ""
            
            filtered_memories.append(
                f"{len(filtered_memories)+1}. {doc[:80]}{'...' if len(doc) > 80 else ''}{tag_str}\n"
                f"   ID: {memory_id} | ⭐ {importance}/10 | 🕒 {timestamp[:10]}"
            )
    
    if not filtered_memories:
        return f"No memories found with tags: {tags}"
    
    total_count = memory_server.collection.count()
    showing = len(filtered_memories)
    
    return f"📚 Showing {showing} of {total_count} memories:\n\n" + "\n\n".join(filtered_memories)

@app.tool()
def memory_stats() -> str:
    """
    Get memory storage statistics.
    
    Returns:
        Memory usage statistics
    """
    total_memories = memory_server.collection.count()
    
    if total_memories == 0:
        return "📊 Memory Statistics:\n- Total memories: 0\n- Storage: Empty"
    
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
    
    return "\n".join(stats)

if __name__ == "__main__":
    # Run the server
    import uvicorn
    import sys
    
    # Default port
    port = 8000
    
    # Check for port argument
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}, using default 8000")
    
    print(f"Starting Memory Server on port {port}")
    print(f"Memory storage: {memory_server.data_dir}")
    
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")