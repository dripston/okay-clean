document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add animation class to feature boxes when they come into view
    const featureBoxes = document.querySelectorAll('.feature-box');
    
    const observerOptions = {
        threshold: 0.2
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    featureBoxes.forEach(box => {
        observer.observe(box);
    });
    
    // Add parallax effect to hero image
    const heroImage = document.querySelector('.hero-image img');
    if (heroImage) {
        window.addEventListener('mousemove', function(e) {
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;
            
            const moveX = (mouseX - 0.5) * 20;
            const moveY = (mouseY - 0.5) * 20;
            
            heroImage.style.transform = `perspective(1000px) rotateY(${-moveX}deg) rotateX(${moveY}deg)`;
        });
    }
    
    // Add gradient animation to headings
    const gradientHeadings = document.querySelectorAll('.logo h1, .hero-content h1, .features h2');
    gradientHeadings.forEach(heading => {
        heading.style.backgroundSize = '200% auto';
        heading.style.animation = 'gradientShift 5s ease infinite';
    });
    
    // Add CSS for the animation if it doesn't exist
    if (!document.querySelector('#gradient-animation-style')) {
        const style = document.createElement('style');
        style.id = 'gradient-animation-style';
        style.textContent = `
            @keyframes gradientShift {
                0% { background-position: 0% center; }
                50% { background-position: 100% center; }
                100% { background-position: 0% center; }
            }
        `;
        document.head.appendChild(style);
    }
});