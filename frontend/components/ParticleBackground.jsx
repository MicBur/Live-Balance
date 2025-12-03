"use client";

import { useEffect, useRef } from 'react';

export default function ParticleBackground() {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const mouseRef = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let width = window.innerWidth;
        let height = window.innerHeight;

        canvas.width = width;
        canvas.height = height;

        // Particle configuration
        const particleCount = Math.min(150, Math.floor((width * height) / 10000));
        const maxDistance = 120;
        const mouseRadius = 150;
        const returnForce = 0.03;
        const repelForce = 0.8;

        class Particle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.originX = this.x;
                this.originY = this.y;
                this.vx = 0;
                this.vy = 0;
                this.size = Math.random() * 2 + 1;
                this.opacity = Math.random() * 0.5 + 0.3;
            }

            update(mouseX, mouseY) {
                // Calculate distance to mouse
                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const distToMouse = Math.sqrt(dx * dx + dy * dy);

                // Mouse repulsion
                if (distToMouse < mouseRadius) {
                    const force = (mouseRadius - distToMouse) / mouseRadius;
                    this.vx -= (dx / distToMouse) * force * repelForce;
                    this.vy -= (dy / distToMouse) * force * repelForce;
                }

                // Return to origin
                const dxOrigin = this.originX - this.x;
                const dyOrigin = this.originY - this.y;
                this.vx += dxOrigin * returnForce;
                this.vy += dyOrigin * returnForce;

                // Apply velocity with damping
                this.vx *= 0.95;
                this.vy *= 0.95;

                this.x += this.vx;
                this.y += this.vy;
            }

            draw() {
                ctx.fillStyle = `rgba(6, 182, 212, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Initialize particles
        particlesRef.current = [];
        for (let i = 0; i < particleCount; i++) {
            particlesRef.current.push(new Particle());
        }

        // Animation loop
        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            const particles = particlesRef.current;
            const mouse = mouseRef.current;

            // Update and draw particles
            particles.forEach(particle => {
                particle.update(mouse.x, mouse.y);
                particle.draw();
            });

            // Draw connecting lines
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < maxDistance) {
                        const opacity = (1 - distance / maxDistance) * 0.2;
                        ctx.strokeStyle = `rgba(6, 182, 212, ${opacity})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        // Mouse move handler
        const handleMouseMove = (e) => {
            mouseRef.current = {
                x: e.clientX,
                y: e.clientY
            };
        };

        // Resize handler
        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;

            // Reinitialize particles on resize
            particlesRef.current = [];
            const newCount = Math.min(150, Math.floor((width * height) / 10000));
            for (let i = 0; i < newCount; i++) {
                particlesRef.current.push(new Particle());
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
            style={{ opacity: 0.6 }}
        />
    );
}
