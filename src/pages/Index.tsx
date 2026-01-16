import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, Play, Star, LogOut } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const [childName, setChildName] = useState('');
  const sounds = useSoundEffects();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleStart = () => {
    sounds.celebrate();
    // Store name in session for use in diagnostic
    sessionStorage.setItem('studentName', childName || 'Champion');
    navigate('/diagnostic');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-background overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl"
            initial={{ 
              x: Math.random() * 100 + '%',
              y: -50,
              rotate: 0
            }}
            animate={{
              y: '120vh',
              rotate: 360
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              delay: i * 2,
              ease: 'linear'
            }}
          >
            {['⭐', '🌟', '✨', '💫', '🎈', '🎉'][i]}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        {/* Logo/Mascot area */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: 'spring',
            stiffness: 200,
            damping: 15
          }}
          className="mb-8"
        >
          <div className="relative">
            <motion.span 
              className="text-8xl block"
              animate={{ 
                y: [0, -10, 0],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              🦉
            </motion.span>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles className="w-8 h-8 text-yellow-400" />
            </motion.div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-8"
        >
          <h1 className="text-child-xl font-bold text-foreground mb-2">
            Math Adventure
          </h1>
          <p className="text-child-base text-muted-foreground">
            Let's discover your superpowers! 🚀
          </p>
        </motion.div>

        {/* Name input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-sm mb-8"
        >
          <label className="block text-center text-muted-foreground mb-2">
            What's your name, superstar?
          </label>
          <Input
            type="text"
            placeholder="Enter your name..."
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            className="text-center text-lg h-14 rounded-2xl border-2 focus:border-primary"
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          />
        </motion.div>

        {/* Start button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            size="lg"
            onClick={handleStart}
            className="btn-child bg-primary text-primary-foreground text-child-base px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <Play className="w-6 h-6 mr-2" />
            Let's Go!
          </Button>
        </motion.div>

        {/* Features preview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 flex flex-wrap justify-center gap-4"
        >
          {[
            { icon: '🎮', label: 'Fun Games' },
            { icon: '🎯', label: 'Just for You' },
            { icon: '🏆', label: 'Earn Stars' },
          ].map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + i * 0.1 }}
              className="flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full"
            >
              <span className="text-2xl">{feature.icon}</span>
              <span className="text-sm font-medium text-muted-foreground">
                {feature.label}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* User info and sign out */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-8 flex flex-col items-center gap-2"
        >
          {user && (
            <p className="text-sm text-muted-foreground">
              Signed in as {user.email}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/parent')}
            >
              <Star className="w-4 h-4 mr-1" />
              Parent Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-1" />
              Sign Out
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
