'use client'

import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] } },
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

export function AnimatedSection({
  children,
  className,
  animate,
}: {
  children: ReactNode
  className?: string
  animate?: boolean
}) {
  return (
    <motion.section
      initial="hidden"
      {...(animate ? { animate: 'visible' } : { whileInView: 'visible', viewport: { once: true, margin: '-80px' } })}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  )
}

export function AnimatedDiv({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div variants={fadeIn} className={className}>
      {children}
    </motion.div>
  )
}

export function AnimatedP({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.p variants={fadeIn} className={className}>
      {children}
    </motion.p>
  )
}

export function AnimatedH1({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.h1 variants={fadeIn} className={className}>
      {children}
    </motion.h1>
  )
}

export function AnimatedH2({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.h2 variants={fadeIn} className={className}>
      {children}
    </motion.h2>
  )
}
