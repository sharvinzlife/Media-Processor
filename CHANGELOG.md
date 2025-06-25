# Changelog

All notable changes to the Media Processor project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v3.5.0] - 2025-06-25

### 🎨 Major UI/UX Overhaul - Professional Navigation & Enhanced Animations

#### Added
- **Top Navigation Bar**: Modern horizontal navbar with glassmorphism effects
- **Enhanced Animations**: Professional hover effects with spring physics and shimmer
- **Emoji Integration**: Interactive navigation icons (📊 📁 ⚙️ 🗄️ 🖥️)
- **Typewriter Animation**: Restored rotating slogans with 10 dynamic messages
- **Feature Pills**: Interactive showcase with multi-layer hover animations (⚡🎯📊🔒)
- **Advanced Animation System**: Scale, lift, rotation, and glow effects
- **Spring Physics**: Realistic animation behavior with proper damping
- **Multi-layer Effects**: Background gradients, shimmer, and border highlights

#### Changed
- **Navigation Layout**: Moved from sidebar to top horizontal navbar
- **Navbar Height**: Increased from 64px to 80px for better breathing room
- **Navigation Spacing**: Enhanced from 4px to 24px gaps between items
- **Button Sizing**: Expanded from 70px to 90px minimum width
- **Icon Sizing**: Upgraded emoji size from base to xl, icons from 20px to 24px
- **Logo Enhancement**: Increased from 40px to 48px with larger emoji
- **Theme Toggle**: Enhanced button size and icon dimensions

#### Fixed
- **Header Overflow**: Resolved content bleeding into navbar area
- **Layout Spacing**: Proper content padding to match taller navbar
- **Component Integration**: Merged AnimatedHeader into Dashboard component
- **Duplicate Content**: Eliminated overlapping titles and redundant elements
- **Navigation Persistence**: Enhanced state management for tab switching
- **Performance**: Optimized re-renders and animation cleanup

#### Technical Improvements
- **Component Architecture**: Cleaner separation of concerns
- **Animation Performance**: Efficient cleanup and reduced sensitivity
- **Responsive Design**: Better mobile/desktop handling
- **Theme Integration**: All animations work seamlessly in dark/light modes
- **TypeScript Enhancement**: Better type safety for animation props

### Files Modified
- `web-app/frontend/src/components/ui/Layout.tsx` - Complete navigation redesign
- `web-app/frontend/src/features/dashboard/Dashboard.tsx` - Integrated animations and typewriter
- `web-app/frontend/src/components/ui/AnimatedHeader.tsx` - Enhanced feature pills
- `package.json` - Version bump to 3.5.0
- `web-app/frontend/package.json` - Version bump to 3.5.0
- `CLAUDE.md` - Updated with comprehensive documentation
- `README.md` - Updated changelog and features
- `CHANGELOG.md` - Added this comprehensive changelog

## [v3.4.0] - 2025-06-22

### 🎨 Complete Frontend Rebuild with Modern React

#### Major Frontend Overhaul
- **Rebuilt**: Entire frontend from scratch using modern React 18 with TypeScript
- **Tech Stack**: Vite, Tailwind CSS v3.4.3, Zustand, React Query, Framer Motion
- **UI/UX**: Beautiful glassmorphism design with smooth animations and responsive layout
- **Architecture**: Component-based architecture with proper separation of concerns

#### Critical Fixes
- **Fixed**: Emoji rendering issue in header (🎬 📺) caused by CSS `gradient-text` class
  - Root cause: `-webkit-text-fill-color: transparent` was making emojis invisible
  - Solution: Applied gradient only to text, excluded emojis with explicit color reset
- **Fixed**: Light mode visibility issues across all components
  - Made all components theme-aware with proper contrast
  - Fixed Library Overview, File History, and Dashboard components
- **Fixed**: Layout alignment issues and sidebar positioning
- **Fixed**: Date formatting showing "Invalid Date" and status labels

#### New Features
- **Added**: Animated header with typewriter effect and rotating slogans
- **Added**: Beautiful animated footer with social links
- **Added**: Light/Dark mode toggle with localStorage persistence
- **Added**: Proper theme context for consistent theming
- **Added**: Status normalization for backend data compatibility

#### Performance Improvements
- **Optimized**: Removed monolithic 5000+ line HTML file
- **Improved**: Build size and loading performance with Vite
- **Enhanced**: CSS with PostCSS and optimized Tailwind configuration

### 🛠️ Technical Stack Updates
- **Frontend**: React 18.3.1, TypeScript 5.7.2, Vite 6.3.5
- **Styling**: Tailwind CSS 3.4.3 (downgraded from v4 for compatibility)
- **State**: Zustand 5.0.3, React Query 5.66.0
- **Animations**: Framer Motion 11.15.0
- **Charts**: Recharts 2.15.0
- **Icons**: Heroicons 2.2.0

## [v3.3.8] - 2025-06-21

### 🚀 Major Dashboard Performance & Functionality Fixes

#### High CPU Usage Resolution
- **Fixed**: Critical performance issue causing 100% CPU usage from multiple overlapping JavaScript polling scripts
- **Disabled**: 8 redundant JavaScript files that were creating duplicate polling intervals
- **Optimized**: Consolidated essential functionality into single `consolidated_fix.js` file
- **Result**: CPU usage reduced from 100% to normal levels

#### File History Loading Issue
- **Fixed**: File history table stuck on "Loading file history..." indefinitely
- **Corrected**: API endpoint integration in `server.js` to include files array in stats response
- **Enhanced**: File history displays all 11 processed files (3 English movies, 2 Malayalam movies, 6 Malayalam TV shows)
- **Resolved**: JavaScript selector error using jQuery-style `:contains` selectors

#### Dashboard Statistics & Real-time Updates
- **Fixed**: Dashboard showing zero statistics across all media types
- **Corrected**: API endpoint routing to use local `stats.json` instead of Python API for statistics
- **Working**: Real-time statistics updates with proper file counts
- **Enhanced**: Statistics polling with reduced frequency to prevent performance issues

#### Port Conflict Resolution
- **Fixed**: Web UI service failing to start due to port 3005 already in use
- **Resolved**: Multiple Node.js instances competing for same port
- **Implemented**: Proper service restart procedure to prevent conflicts

#### JavaScript Error Fixes
- **Fixed**: `Document.querySelector: 'button:contains("Scan SMB")' is not a valid selector` error
- **Replaced**: jQuery-style selectors with native JavaScript `Array.from().find()` approach
- **Enhanced**: Manual scan button functionality now working properly

### 🛠️ Technical Improvements

#### Frontend Architecture Cleanup
- **Streamlined**: Removed 8 overlapping JavaScript files causing performance bottlenecks:
  - `fix_stats_display.js`, `realtime_updates.js`, `dashboard_refresh.js`
  - `enhanced_time_fix.js`, `nuclear_fix.js`, `fix_all_issues.js`
  - `clean_interface_fix.js`, `manual_scan_ui.js` (duplicate functionality)
- **Consolidated**: Essential functionality into single optimized script
- **Added**: Debug script for troubleshooting API connectivity

#### API Integration Enhancements
- **Fixed**: Server.js stats endpoint to properly read from local JSON file
- **Added**: Files array inclusion in API responses for file history
- **Improved**: Error handling and response formatting
- **Maintained**: Backward compatibility with existing API structure

#### Service Management
- **Resolved**: Systemd service conflicts preventing proper web UI startup
- **Fixed**: Environment variable loading and port configuration
- **Enhanced**: Service restart reliability and conflict detection

### 🎯 Performance Metrics

#### Before Fix:
- CPU Usage: 100% constant
- File History: Stuck loading indefinitely
- Statistics: All zeros
- JavaScript Errors: Multiple selector and polling conflicts

#### After Fix:
- CPU Usage: Normal levels (< 5%)
- File History: Displays all 11 files properly
- Statistics: Accurate counts (3 English movies, 2 Malayalam movies, 6 Malayalam TV shows)
- JavaScript: Clean execution without errors

### 📊 Working Features Now

```bash
# Dashboard fully functional with:
✅ Real-time statistics display
✅ File history table with 11 processed files
✅ System logs from Python API
✅ SMB diagnostics and settings
✅ Manual scan functionality
✅ Database management interface
✅ Low CPU usage and responsive interface
```

## [v3.3.7] - 2025-06-21

### 🔧 Fixed - Dashboard & System Improvements
- Dashboard statistics showing zero counts
- File history timestamp formatting
- SMB diagnostics configuration issues
- Missing API endpoints for file history
- Service log commands in documentation

## [v3.3.6] - 2025-06-20

### Fixed
- Dashboard statistics display issues
- Malayalam extraction improvements
- Web interface integration enhancements

## [v3.3.5] - 2025-06-19

### Improved
- SMB authentication reliability
- Enhanced Malayalam processing
- Service monitoring capabilities

## [v3.3.3] - 2025-06-18

### Fixed
- Diagnostics JSON parsing errors
- Process monitoring improvements
- Service restart reliability

## [v3.3.2] - 2025-06-17

### Removed
- SMB settings from legacy configuration
- Fixed virtual environment path issues

## [v3.3.1] - 2025-06-16

### Enhanced Malayalam Processing & SMB Authentication

#### Malayalam-Only Track Extraction
- Extract ONLY Malayalam audio + English subtitles
- Delete ALL other tracks (Hindi, Tamil, Telugu, etc.)
- Significant file size reduction (40-60%)
- Enhanced logging of track analysis

#### Malayalam Filename Sanitization
- Remove redundant language indicators from processed files
- Clean up Malayalam, Mal, ML tags from filenames
- Professional organization with standardized naming

#### Enhanced SMB Authentication
- NTLMV2 authentication support
- SMB2/SMB3 protocol enforcement
- Domain credentials file with proper formatting
- Enhanced smbclient options for better compatibility

## [v3.3.0] - 2025-06-15

### Unified Configuration System
- Migrated from JSON to `.env` configuration
- Single source of truth for all components
- Automatic migration from legacy configs
- Environment variable mapping for all services

## [v3.2.0] - 2025-06-14

### Automated Dependency Management
- Universal installer script with platform detection
- Zero manual installation required
- Platform-specific dependency files
- Python requirements with platform markers

## [v3.1.0] - 2025-06-13

### Cross-Platform Support
- Windows support via PowerShell scripts and NSSM
- Enhanced macOS LaunchAgents
- Platform-specific service management
- Universal setup experience

## [v3.0.0] - 2025-06-12

### Complete Python Modularization
- Full migration from shell scripts to Python modules
- Unified file history format
- Enhanced error handling and recovery
- Recursive directory scanning with `os.walk()`
- Eliminated all code duplication