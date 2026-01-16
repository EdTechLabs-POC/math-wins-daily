import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedBirdsProps {
  count: number;
}

/**
 * Animated birds sitting on a branch
 * Fun, colorful birds that bob and chirp
 */
export function AnimatedBirds({ count }: AnimatedBirdsProps) {
  const birdColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
      {/* Sky background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-300 to-sky-100 dark:from-sky-900 dark:to-sky-700 rounded-2xl" />
      
      {/* Sun */}
      <motion.div
        className="absolute top-4 right-8 w-16 h-16 bg-yellow-300 rounded-full"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.9, 1, 0.9],
        }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ boxShadow: '0 0 40px rgba(255, 200, 0, 0.5)' }}
      />
      
      {/* Cloud */}
      <motion.div
        className="absolute top-8 left-8"
        animate={{ x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex gap-1">
          <div className="w-8 h-6 bg-white/80 rounded-full" />
          <div className="w-12 h-8 bg-white/80 rounded-full -ml-2 -mt-2" />
          <div className="w-8 h-6 bg-white/80 rounded-full -ml-2" />
        </div>
      </motion.div>
      
      {/* Branch */}
      <div className="relative z-10 mt-16">
        <svg width="300" height="40" viewBox="0 0 300 40" className="drop-shadow-lg">
          <path
            d="M0 25 Q75 15, 150 20 Q225 25, 300 18"
            stroke="#8B4513"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          {/* Leaves */}
          <ellipse cx="40" cy="18" rx="12" ry="6" fill="#228B22" transform="rotate(-20 40 18)" />
          <ellipse cx="120" cy="15" rx="10" ry="5" fill="#32CD32" transform="rotate(15 120 15)" />
          <ellipse cx="200" cy="22" rx="11" ry="5" fill="#228B22" transform="rotate(-10 200 22)" />
          <ellipse cx="270" cy="16" rx="12" ry="6" fill="#32CD32" transform="rotate(10 270 16)" />
        </svg>
        
        {/* Birds */}
        <div className="absolute top-0 left-0 w-full flex justify-around" style={{ transform: 'translateY(-35px)' }}>
          {Array.from({ length: count }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, type: 'spring', bounce: 0.5 }}
            >
              <Bird color={birdColors[i % birdColors.length]} index={i} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bird({ color, index }: { color: string; index: number }) {
  return (
    <motion.svg
      width="50"
      height="50"
      viewBox="0 0 50 50"
      animate={{
        y: [0, -3, 0],
        rotate: [-2, 2, -2],
      }}
      transition={{
        duration: 1.5 + index * 0.2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className="cursor-pointer"
      whileHover={{ scale: 1.2 }}
    >
      {/* Body */}
      <ellipse cx="25" cy="28" rx="15" ry="12" fill={color} />
      {/* Head */}
      <circle cx="35" cy="20" r="10" fill={color} />
      {/* Eye */}
      <motion.circle
        cx="38"
        cy="18"
        r="3"
        fill="white"
        animate={{ scaleY: [1, 0.1, 1] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
      />
      <circle cx="39" cy="18" r="1.5" fill="black" />
      {/* Beak */}
      <polygon points="45,20 50,22 45,24" fill="#FFA500" />
      {/* Wing */}
      <motion.ellipse
        cx="22"
        cy="28"
        rx="8"
        ry="6"
        fill={color}
        style={{ filter: 'brightness(0.8)' }}
        animate={{ ry: [6, 4, 6] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
      {/* Tail */}
      <polygon points="10,25 5,20 5,35 10,30" fill={color} style={{ filter: 'brightness(0.9)' }} />
      {/* Feet */}
      <line x1="20" y1="38" x2="18" y2="48" stroke="#FFA500" strokeWidth="2" />
      <line x1="30" y1="38" x2="32" y2="48" stroke="#FFA500" strokeWidth="2" />
    </motion.svg>
  );
}

interface AnimatedApplesProps {
  count: number;
  tappedIds: Set<string>;
  onTap: (id: string) => void;
  disabled?: boolean;
}

/**
 * Animated apples on a tree
 * Bouncy, tappable apples with satisfying interactions
 */
export function AnimatedApples({ count, tappedIds, onTap, disabled }: AnimatedApplesProps) {
  // Generate stable positions
  const [positions] = useState(() => 
    Array.from({ length: count }).map((_, i) => ({
      x: 15 + (i % 4) * 22,
      y: 25 + Math.floor(i / 4) * 25 + (i % 2) * 8,
    }))
  );

  return (
    <div className="relative w-full h-full min-h-[280px]">
      {/* Tree trunk */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-20 bg-gradient-to-r from-amber-700 to-amber-800 rounded-t-lg" />
      
      {/* Tree crown */}
      <div className="absolute inset-4 bottom-16">
        <div className="relative w-full h-full">
          {/* Leaves background */}
          <div className="absolute inset-0 bg-gradient-to-b from-green-500 to-green-600 rounded-full" 
               style={{ borderRadius: '50% 50% 40% 40%' }} />
          
          {/* Apples */}
          {positions.map((pos, i) => {
            const id = `apple-${i}`;
            const isTapped = tappedIds.has(id);
            
            return (
              <motion.button
                key={id}
                onClick={() => !disabled && onTap(id)}
                disabled={disabled}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: 1,
                  y: isTapped ? -8 : 0,
                }}
                whileHover={!disabled ? { scale: 1.15 } : {}}
                whileTap={!disabled ? { scale: 0.9 } : {}}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="absolute"
                style={{ 
                  left: `${pos.x}%`, 
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className={`relative transition-all duration-200 ${isTapped ? 'drop-shadow-lg' : ''}`}>
                  {/* Apple */}
                  <svg width="40" height="44" viewBox="0 0 40 44">
                    {/* Stem */}
                    <path d="M20 4 Q22 0, 24 2 L22 8" fill="#5D4037" />
                    {/* Leaf */}
                    <ellipse cx="26" cy="6" rx="6" ry="3" fill="#4CAF50" transform="rotate(30 26 6)" />
                    {/* Apple body */}
                    <ellipse 
                      cx="20" 
                      cy="26" 
                      rx="16" 
                      ry="18" 
                      fill={isTapped ? '#E53935' : '#F44336'}
                      className="transition-colors"
                    />
                    {/* Shine */}
                    <ellipse cx="12" cy="18" rx="4" ry="6" fill="white" opacity="0.3" />
                  </svg>
                  
                  {/* Selection indicator */}
                  {isTapped && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                    >
                      ✓
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface AnimatedDiceProps {
  value: number;
  size?: number;
}

/**
 * Animated dice with dots
 */
export function AnimatedDice({ value, size = 80 }: AnimatedDiceProps) {
  const dotPositions: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
  };

  const dots = dotPositions[value] || dotPositions[1];

  return (
    <motion.div
      initial={{ rotateY: 0 }}
      animate={{ rotateY: 360 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{ width: size, height: size }}
      className="relative"
    >
      <svg width={size} height={size} viewBox="0 0 100 100">
        {/* Dice body */}
        <rect
          x="5"
          y="5"
          width="90"
          height="90"
          rx="15"
          fill="white"
          stroke="#E0E0E0"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }}
        />
        
        {/* Dots */}
        {dots.map(([cx, cy], i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r="10"
            fill="#333"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
          />
        ))}
      </svg>
    </motion.div>
  );
}

interface AnimatedSticksProps {
  bundleSize: number;
  looseCount: number;
}

/**
 * Animated sticks with bundles
 */
export function AnimatedSticks({ bundleSize, looseCount }: AnimatedSticksProps) {
  return (
    <div className="flex items-center justify-center gap-8">
      {/* Bundle */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col items-center gap-2"
      >
        <div className="relative">
          {/* Bundle of sticks */}
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(bundleSize, 10) }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: 96 }}
                transition={{ delay: i * 0.05, type: 'spring' }}
                className="w-2 rounded-sm"
                style={{
                  background: `linear-gradient(180deg, #D7A86E ${i * 5}%, #8B5A2B 100%)`,
                }}
              />
            ))}
          </div>
          
          {/* Rubber band */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute top-8 left-0 right-0 h-3 bg-red-500 rounded-full"
            style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}
          />
          
          {/* Label badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: 'spring' }}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg"
          >
            {bundleSize}
          </motion.div>
        </div>
        <span className="text-sm text-muted-foreground font-medium">Bundle of {bundleSize}</span>
      </motion.div>

      {/* Plus sign */}
      <motion.span
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="text-child-xl font-bold text-muted-foreground"
      >
        +
      </motion.span>

      {/* Loose sticks */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col items-center gap-2"
      >
        <div className="flex gap-2">
          {Array.from({ length: looseCount }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 80, opacity: 1 }}
              transition={{ delay: 0.8 + i * 0.15, type: 'spring' }}
              className="w-3 rounded-sm"
              style={{
                background: `linear-gradient(180deg, #D7A86E 0%, #A0522D 100%)`,
              }}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground font-medium">
          {looseCount} loose stick{looseCount !== 1 ? 's' : ''}
        </span>
      </motion.div>
    </div>
  );
}

/**
 * Celebration confetti animation
 */
export function Confetti() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB347'];
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * window.innerWidth,
            y: -20,
            rotate: 0,
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            y: window.innerHeight + 20,
            rotate: Math.random() * 720 - 360,
            x: Math.random() * window.innerWidth,
          }}
          transition={{
            duration: Math.random() * 2 + 2,
            delay: Math.random() * 0.5,
            ease: 'linear',
          }}
          className="absolute"
          style={{
            width: Math.random() * 10 + 5,
            height: Math.random() * 10 + 5,
            backgroundColor: colors[i % colors.length],
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
    </div>
  );
}
