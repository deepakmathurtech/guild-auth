import React, { useMemo } from 'react'

const Particles: React.FC = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 4 + 2}px`,
      duration: `${Math.random() * 20 + 10}s`,
      delay: `${Math.random() * -20}s`,
    }))
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-20 bg-[var(--accent)]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            filter: 'blur(1px)',
            animation: `float ${p.duration} linear infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0% { transform: translateY(110vh) translateX(0); }
          100% { transform: translateY(-10vh) translateX(20px); }
        }
      `}</style>
    </div>
  )
}

export default Particles
