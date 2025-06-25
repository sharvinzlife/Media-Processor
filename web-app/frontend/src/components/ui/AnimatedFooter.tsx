import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';
import { HeartIcon } from '@heroicons/react/24/solid';

const socialLinks = [
  {
    name: 'GitHub',
    url: 'https://github.com/sharvinzlife',
    icon: '💻',
    color: 'hover:text-gray-900 hover:bg-gray-100'
  },
  {
    name: 'Website',
    url: 'https://sharvinzlife.com/',
    icon: '🌐',
    color: 'hover:text-blue-600 hover:bg-blue-50'
  },
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/sharvinzlife/',
    icon: '📸',
    color: 'hover:text-pink-600 hover:bg-pink-50'
  },
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/sharvinzlife',
    icon: '👥',
    color: 'hover:text-blue-700 hover:bg-blue-50'
  },
  {
    name: 'Twitter',
    url: 'https://x.com/sharvinzlife',
    icon: '🐦',
    color: 'hover:text-sky-500 hover:bg-sky-50'
  }
];

const containerVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

export const AnimatedFooter: React.FC = () => {
  const { isDark } = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "relative mt-auto overflow-hidden backdrop-blur-xl border-t",
        isDark
          ? "bg-gradient-to-r from-slate-900/80 via-slate-800/90 to-slate-900/80 border-slate-700/50"
          : "bg-gradient-to-r from-white/95 via-slate-50/95 to-white/95 border-slate-300/50"
      )}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <motion.div
          className="absolute top-0 left-1/4 w-32 h-32 rounded-full opacity-10"
          style={{
            background: isDark 
              ? "radial-gradient(circle, #3b82f6, #8b5cf6)"
              : "radial-gradient(circle, #60a5fa, #a78bfa)"
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-24 h-24 rounded-full opacity-10"
          style={{
            background: isDark 
              ? "radial-gradient(circle, #f59e0b, #ef4444)"
              : "radial-gradient(circle, #fbbf24, #f87171)"
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Floating Hearts */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-red-400/20 text-sm"
            style={{
              left: `${15 + i * 20}%`,
              top: `${20 + Math.random() * 60}%`,
            }}
            animate={{
              y: [-5, 5, -5],
              rotate: [-5, 5, -5],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2 + Math.random(),
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            ❤️
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8">
        <div className="text-center space-y-6">
          {/* Main Content */}
          <motion.div variants={itemVariants} className="space-y-4">
            {/* Created with Love */}
            <div className="flex items-center justify-center gap-2 text-lg">
              <span className={cn(
                "font-medium",
                isDark ? "text-slate-300" : "text-slate-800"
              )}>
                Created with
              </span>
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <HeartIcon className="w-6 h-6 text-red-500" />
              </motion.div>
              <span className={cn(
                "font-medium",
                isDark ? "text-slate-300" : "text-slate-800"
              )}>
                by
              </span>
              <motion.span
                className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600"
                whileHover={{ scale: 1.05 }}
              >
                Sharvin
              </motion.span>
            </div>

            {/* Emoji Decoration */}
            <motion.div
              className="flex justify-center space-x-2 text-2xl"
              variants={itemVariants}
            >
              {['🚀', '✨', '💎', '🎯', '🔥'].map((emoji, index) => (
                <motion.span
                  key={emoji}
                  animate={{
                    y: [0, -10, 0],
                    rotate: [-5, 5, -5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.2,
                    ease: "easeInOut"
                  }}
                >
                  {emoji}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>

          {/* Social Links */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h3 className={cn(
              "text-lg font-semibold",
              isDark ? "text-slate-200" : "text-slate-900"
            )}>
              Connect with me 🌟
            </h3>
            
            <div className="flex flex-wrap justify-center gap-3">
              {socialLinks.map((link, index) => (
                <motion.a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm transition-all duration-300",
                    isDark
                      ? "bg-slate-800/50 text-slate-300 border border-slate-600/30 hover:bg-slate-700/60 hover:border-slate-500/50"
                      : "bg-white/90 text-slate-800 border border-slate-300/60 hover:bg-white hover:border-slate-400/70"
                  )}
                  whileHover={{ 
                    scale: 1.05,
                    y: -2,
                  }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <motion.span 
                    className="text-lg"
                    animate={{
                      rotate: [0, 10, 0, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.3,
                    }}
                  >
                    {link.icon}
                  </motion.span>
                  <span className="text-sm font-medium group-hover:font-semibold transition-all">
                    {link.name}
                  </span>
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Copyright */}
          <motion.div 
            variants={itemVariants}
            className={cn(
              "text-sm border-t pt-4",
              isDark 
                ? "text-slate-400 border-slate-700/50" 
                : "text-slate-600 border-slate-300/50"
            )}
          >
            <p>© {currentYear} Media Processor Dashboard. Made with passion and countless cups of coffee ☕</p>
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient Line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 via-pink-500 to-orange-500"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
    </motion.footer>
  );
};