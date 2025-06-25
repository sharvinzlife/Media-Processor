import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

const slogans = [
  "🎬 Your Ultimate Media Hub",
  "🚀 Processing Media with Style",
  "✨ Streamlining Your Collection", 
  "🎯 Smart Media Organization",
  "🔥 Lightning Fast Processing",
  "💎 Crystal Clear Quality",
  "🌟 Premium Media Experience",
  "🎪 Entertainment Central Station",
  "🎭 Where Movies Come Alive",
  "📺 TV Shows Organized Perfectly"
];

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ text, speed = 50, onComplete }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      const timer = setTimeout(onComplete, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed, onComplete]);

  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <span className="inline-block">
      {displayText}
      <motion.span
        className="inline-block w-0.5 h-6 bg-current ml-1"
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </span>
  );
};

export const AnimatedHeader: React.FC = () => {
  const { isDark } = useTheme();
  const [currentSloganIndex, setCurrentSloganIndex] = useState(0);

  const handleSloganComplete = () => {
    setTimeout(() => {
      setCurrentSloganIndex(prev => (prev + 1) % slogans.length);
    }, 2000);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden backdrop-blur-xl border-b",
        isDark
          ? "bg-gradient-to-r from-slate-900/70 via-slate-800/80 to-slate-900/70 border-slate-700/50"
          : "bg-gradient-to-r from-white/95 via-slate-50/95 to-white/95 border-slate-300/50"
      )}
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-4 -left-4 w-24 h-24 rounded-full opacity-20"
          style={{
            background: isDark 
              ? "linear-gradient(45deg, #3b82f6, #8b5cf6)"
              : "linear-gradient(45deg, #60a5fa, #a78bfa)"
          }}
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-4 -right-4 w-32 h-32 rounded-full opacity-15"
          style={{
            background: isDark 
              ? "linear-gradient(135deg, #f59e0b, #ef4444)"
              : "linear-gradient(135deg, #fbbf24, #f87171)"
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        {/* Floating Particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              "absolute w-2 h-2 rounded-full",
              isDark ? "bg-blue-400/30" : "bg-blue-500/20"
            )}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-20 container mx-auto px-6 py-8">
        <div className="text-center space-y-4">
          {/* Main Title */}
          <motion.h1 
            className="text-4xl md:text-6xl font-bold mb-4 relative z-20"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8, ease: "backOut" }}
          >
            <span 
              className="emoji inline-block mr-3 text-5xl relative z-30" 
              style={{ 
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                WebkitTextFillColor: 'initial',
                color: 'initial'
              }}
            >
              &#127916;
            </span>
            <span className="gradient-text">Media Library Dashboard</span>
            <span 
              className="emoji inline-block ml-3 text-5xl relative z-30" 
              style={{ 
                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                WebkitTextFillColor: 'initial',
                color: 'initial'
              }}
            >
              &#128250;
            </span>
          </motion.h1>

          {/* Animated Slogan */}
          <motion.div
            className="h-12 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <div className={cn(
              "text-xl md:text-2xl font-medium",
              isDark ? "text-slate-300" : "text-slate-800"
            )}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSloganIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.5 }}
                >
                  <TypewriterText 
                    text={slogans[currentSloganIndex]} 
                    speed={80}
                    onComplete={handleSloganComplete}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className={cn(
              "text-lg max-w-3xl mx-auto leading-relaxed",
              isDark ? "text-slate-400" : "text-slate-700"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            Track your media processing statistics in real-time with beautiful visualizations and seamless organization
          </motion.p>

          {/* Stats Pills */}
          <motion.div
            className="flex flex-wrap justify-center gap-3 mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 0.6 }}
          >
            {[
              { icon: "⚡", label: "Fast Processing" },
              { icon: "🎯", label: "Smart Detection" },
              { icon: "📊", label: "Real-time Stats" },
              { icon: "🔒", label: "Secure Storage" }
            ].map((item, index) => (
              <motion.div
                key={item.label}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm cursor-pointer relative overflow-hidden group",
                  isDark
                    ? "bg-slate-800/50 text-slate-300 border border-slate-600/30"
                    : "bg-white/90 text-slate-800 border border-slate-300/60"
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ 
                  scale: 1.1, 
                  y: -5,
                  transition: { type: "spring", stiffness: 400, damping: 10 }
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ delay: 1.8 + index * 0.1 }}
              >
                {/* Hover background effect */}
                <motion.div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                  style={{
                    background: isDark 
                      ? "linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))"
                      : "linear-gradient(45deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))"
                  }}
                  transition={{ duration: 0.3 }}
                />
                
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full"
                  transition={{ duration: 0.6 }}
                />
                
                {/* Animated emoji */}
                <motion.span 
                  className="text-lg relative z-10"
                  whileHover={{
                    rotate: [0, -10, 10, 0],
                    scale: 1.2,
                    transition: { duration: 0.4 }
                  }}
                >
                  {item.icon}
                </motion.span>
                
                {/* Text with glow effect */}
                <motion.span 
                  className="text-sm font-medium relative z-10"
                  whileHover={{
                    textShadow: isDark 
                      ? "0 0 8px rgba(59, 130, 246, 0.6)" 
                      : "0 0 8px rgba(59, 130, 246, 0.4)",
                    transition: { duration: 0.3 }
                  }}
                >
                  {item.label}
                </motion.span>
                
                {/* Pulsing border on hover */}
                <div className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave Effect */}
      <div className="absolute bottom-0 left-0 right-0 h-1">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 2, duration: 1.5, ease: "easeInOut" }}
        />
      </div>
    </motion.header>
  );
};