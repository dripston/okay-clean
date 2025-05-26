// Main JavaScript file for the weather app
document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations and effects
    initAnimations();
    
    // Add parallax effect to hero section
    initParallax();
    
    // Initialize feature box animations
    initFeatureBoxes();
    
    // Add smooth scrolling for anchor links
    initSmoothScroll();
    
    // Initialize weather card tilt effect
    initTiltEffect();
    
    // Initialize current weather data
    fetchCurrentWeather();
});

// Initialize animations
function initAnimations() {
    // Check if GSAP is available
    if (typeof gsap !== 'undefined') {
        // Animate header elements
        gsap.from('header', { 
            y: -100, 
            opacity: 0, 
            duration: 1, 
            ease: 'power3.out' 
        });
        
        // Animate hero content
        gsap.from('.hero-content', { 
            x: -50, 
            opacity: 0, 
            duration: 1, 
            delay: 0.3, 
            ease: 'power3.out' 
        });
        
        // Animate hero image
        gsap.from('.hero-image', { 
            x: 50, 
            opacity: 0, 
            duration: 1, 
            delay: 0.5, 
            ease: 'power3.out' 
        });
        
        // Animate feature boxes
        gsap.utils.toArray('.feature-box').forEach((box, i) => {
            const delay = 0.2 + (i * 0.2);
            gsap.to(box, { 
                opacity: 1, 
                y: 0, 
                duration: 0.8, 
                delay: delay, 
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: box,
                    start: 'top 80%'
                }
            });
        });
        
        // Animate insight cards
        gsap.utils.toArray('.insight-card').forEach((card, i) => {
            gsap.from(card, { 
                y: 50, 
                opacity: 0, 
                duration: 0.8, 
                delay: 0.1 * i, 
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: card,
                    start: 'top 80%'
                }
            });
        });
        
        // Animate CTA section
        gsap.from('.cta-content', { 
            y: 50, 
            opacity: 0, 
            duration: 1, 
            ease: 'power3.out',
            scrollTrigger: {
                trigger: '.cta',
                start: 'top 80%'
            }
        });
    } else {
        console.warn('GSAP not loaded, using fallback animations');
        
        // Add basic CSS animations as fallback
        document.querySelectorAll('.feature-box').forEach((box, index) => {
            box.style.animationDelay = `${index * 0.2}s`;
            box.style.animation = 'fadeInUp 0.8s forwards';
        });
    }
}

// Initialize parallax effect
function initParallax() {
    window.addEventListener('mousemove', function(e) {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        // Apply parallax to hero content
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.style.transform = `translate(${mouseX * -20}px, ${mouseY * -20}px)`;
        }
        
        // Apply parallax to weather card
        const weatherCard = document.querySelector('.weather-card');
        if (weatherCard) {
            weatherCard.style.transform = `translate(${mouseX * 20}px, ${mouseY * 20}px) rotateY(${mouseX * 10 - 5}deg) rotateX(${mouseY * 10 - 5}deg)`;
        }
        
        // Apply parallax to particles
        document.querySelectorAll('.particle').forEach(particle => {
            const speed = parseFloat(particle.getAttribute('data-speed') || Math.random() * 0.2);
            const offsetX = (mouseX - 0.5) * speed * 100;
            const offsetY = (mouseY - 0.5) * speed * 100;
            particle.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });
    });
}

// Initialize feature box animations
function initFeatureBoxes() {
    // Add data-speed attribute to particles for parallax effect
    document.querySelectorAll('.particle').forEach(particle => {
        particle.setAttribute('data-speed', Math.random() * 0.2);
    });
    
    // Add animation to feature boxes on scroll
    const featureBoxes = document.querySelectorAll('.feature-box');
    
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const box = entry.target;
                    const delay = parseFloat(box.getAttribute('data-delay') || 0);
                    
                    setTimeout(() => {
                        box.style.opacity = 1;
                        box.style.transform = 'translateY(0)';
                    }, delay * 1000);
                    
                    observer.unobserve(box);
                }
            });
        }, { threshold: 0.2 });
        
        featureBoxes.forEach(box => {
            observer.observe(box);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        featureBoxes.forEach(box => {
            box.style.opacity = 1;
            box.style.transform = 'translateY(0)';
        });
    }
}

// Initialize smooth scrolling
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Initialize tilt effect for weather card
function initTiltEffect() {
    const weatherCard = document.querySelector('.weather-card');
    if (!weatherCard) return;
    
    weatherCard.addEventListener('mousemove', function(e) {
        const cardRect = this.getBoundingClientRect();
        const cardCenterX = cardRect.left + cardRect.width / 2;
        const cardCenterY = cardRect.top + cardRect.height / 2;
        
        const mouseX = e.clientX - cardCenterX;
        const mouseY = e.clientY - cardCenterY;
        
        const rotateY = mouseX / (cardRect.width / 2) * 10;
        const rotateX = -mouseY / (cardRect.height / 2) * 10;
        
        this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    });
    
    weatherCard.addEventListener('mouseleave', function() {
        this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
    });
}

// Fetch current weather data
function fetchCurrentWeather() {
    const weatherIcon = document.querySelector('.weather-icon i');
    const tempValue = document.querySelector('.temp-value');
    const condition = document.querySelector('.condition');
    const humidity = document.querySelector('.detail:nth-child(1) span');
    const windSpeed = document.querySelector('.detail:nth-child(2) span');
    
    // If we have all the elements, try to fetch current weather
    if (weatherIcon && tempValue && condition && humidity && windSpeed) {
        // Try to fetch from API first
        fetch('/api/current-weather')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Weather API not available');
                }
                return response.json();
            })
            .then(data => {
                updateWeatherUI(data);
            })
            .catch(error => {
                console.warn('Could not fetch weather data:', error);
                // Use fallback data
                const fallbackData = {
                    temperature: 28,
                    condition: 'Partly Cloudy',
                    humidity: 45,
                    windSpeed: 8
                };
                updateWeatherUI(fallbackData);
            });
    }
}

// Update weather UI with data
function updateWeatherUI(data) {
    const weatherIcon = document.querySelector('.weather-icon i');
    const tempValue = document.querySelector('.temp-value');
    const condition = document.querySelector('.condition');
    const humidity = document.querySelector('.detail:nth-child(1) span');
    const windSpeed = document.querySelector('.detail:nth-child(2) span');
    
    // Update temperature
    if (tempValue) {
        tempValue.textContent = Math.round(data.temperature) + '°';
    }
    
    // Update condition and icon
    if (condition) {
        condition.textContent = data.condition;
    }
    
    if (weatherIcon) {
        // Set icon based on condition
        const conditionText = data.condition.toLowerCase();
        
        if (conditionText.includes('clear') || conditionText.includes('sunny')) {
            weatherIcon.className = 'fas fa-sun';
        } else if (conditionText.includes('cloud')) {
            weatherIcon.className = 'fas fa-cloud-sun';
        } else if (conditionText.includes('rain') || conditionText.includes('drizzle')) {
            weatherIcon.className = 'fas fa-cloud-rain';
        } else if (conditionText.includes('thunder')) {
            weatherIcon.className = 'fas fa-bolt';
        } else if (conditionText.includes('snow')) {
            weatherIcon.className = 'fas fa-snowflake';
        } else if (conditionText.includes('fog') || conditionText.includes('mist')) {
            weatherIcon.className = 'fas fa-smog';
        } else {
            weatherIcon.className = 'fas fa-cloud';
        }
    }
    
    // Update humidity and wind speed
    if (humidity) {
        humidity.textContent = data.humidity + '%';
    }
    
    if (windSpeed) {
        windSpeed.textContent = data.windSpeed + ' km/h';
    }
}