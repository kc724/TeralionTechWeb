// 導航欄與頁面互動
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const closeNavMenu = () => {
        if (hamburger && navMenu) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    };

    // 漢堡選單切換
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // 點擊選單項目時關閉漢堡選單
    document.querySelectorAll('.nav-menu a').forEach(link => {
        link.addEventListener('click', () => closeNavMenu());
    });

    document.addEventListener('click', function(event) {
        if (window.innerWidth > 968 || !navMenu || !hamburger) return;
        const clickedInsideNav = navMenu.contains(event.target) || hamburger.contains(event.target);
        if (!clickedInsideNav && navMenu.classList.contains('active')) {
            closeNavMenu();
        }
    });

    // 平滑滾動到錨點
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // 導航欄滾動效果
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                navbar.style.boxShadow = '0 4px 20px rgba(0, 79, 101, 0.1)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.9)';
                navbar.style.boxShadow = 'none';
            }
        }
    });

    // 神經網路背景 — 每個區塊各自的節點網路，隨機漂移並隨滑鼠互動
    initNetworkCanvases(prefersReducedMotion);

    // 表單提交處理（若頁面上有聯絡表單）
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = this.querySelector('input[type="text"]')?.value;
            const email = this.querySelector('input[type="email"]')?.value;
            const message = this.querySelector('textarea')?.value;

            if (!name || !email || !message) {
                showNotification('請填寫所有必填欄位', 'error');
                return;
            }
            if (!isValidEmail(email)) {
                showNotification('請輸入有效的電子郵件地址', 'error');
                return;
            }
            showNotification('訊息已發送！我們會盡快回覆您。', 'success');
            this.reset();
        });
    }
});

// 電子郵件驗證函數
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 通知函數
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;

    if (type === 'success') {
        notification.style.background = '#0f8a6b';
    } else if (type === 'error') {
        notification.style.background = '#c0392b';
    } else {
        notification.style.background = '#004F65';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 神經網路背景 — 每個區塊各自一張 canvas，節點隨機漂移、彼此連線，
// 並在滑鼠靠近時額外連向游標，效果延伸至該區塊全寬（含容器外的留白）。
function initNetworkCanvases(prefersReducedMotion) {
    const canvases = document.querySelectorAll('canvas.glow-layer');
    if (!canvases.length) return;

    const mouse = { x: null, y: null };
    window.addEventListener('mousemove', function(e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', function() {
        mouse.x = null;
        mouse.y = null;
    });

    canvases.forEach(function(canvas) {
        const ctx = canvas.getContext('2d');
        const dotColor = canvas.classList.contains('glow-dark') ? '175, 214, 227' : '0, 79, 101';

        let width = 0;
        let height = 0;
        let particles = [];
        let animId = null;
        let resizeTimer = null;
        let linkAlpha = new Float32Array(0);
        let lastLocalX = null;
        let lastLocalY = null;
        let mouseDotAlpha = 0;

        function buildParticles() {
            const count = Math.min(150, Math.max(30, Math.round((width * height) / 13000)));
            particles = Array.from({ length: count }, function() {
                // 節點大小隨機決定，大節點連接半徑較大（連線較多），小節點較小（連線較少）
                const r = Math.random() * 2.2 + 0.5;
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.28,
                    vy: (Math.random() - 0.5) * 0.28,
                    r: r,
                    reach: 55 + r * 65,
                    mouseAlpha: 0
                };
            });
            // i*count+j 矩陣記錄每一對節點的目前透明度，讓連線的出現／消失都是漸變而非瞬間切換
            linkAlpha = new Float32Array(count * count);
        }

        function resize() {
            const rect = canvas.parentElement.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = Math.max(1, Math.round(width * dpr));
            canvas.height = Math.max(1, Math.round(height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            buildParticles();
            draw();
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);

            particles.forEach(function(p) {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x <= 0 || p.x >= width) p.vx *= -1;
                if (p.y <= 0 || p.y >= height) p.vy *= -1;
                p.x = Math.min(width, Math.max(0, p.x));
                p.y = Math.min(height, Math.max(0, p.y));
            });

            const n = particles.length;
            const EASE = 0.12;
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    // 連線半徑取兩節點中較大者，大節點因此連得更多、更遠
                    const reach = Math.max(particles[i].reach, particles[j].reach);
                    const target = dist < reach ? 0.13 * (1 - dist / reach) : 0;
                    const idx = i * n + j;
                    const alpha = linkAlpha[idx] + (target - linkAlpha[idx]) * EASE;
                    linkAlpha[idx] = alpha;
                    if (alpha > 0.002) {
                        ctx.strokeStyle = 'rgba(' + dotColor + ', ' + alpha + ')';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            // 滑鼠連線／游標點：無論滑鼠是否在範圍內，每顆節點的透明度都持續向目標值漸變，
            // 讓連線的出現與消失都是淡入淡出，而不是瞬間切換。
            let mouseInBounds = false;
            if (mouse.x !== null) {
                const rect = canvas.getBoundingClientRect();
                const localX = mouse.x - rect.left;
                const localY = mouse.y - rect.top;
                if (localX > -60 && localX < width + 60 && localY > -60 && localY < height + 60) {
                    mouseInBounds = true;
                    lastLocalX = localX;
                    lastLocalY = localY;
                }
            }

            if (lastLocalX !== null) {
                const mouseLinkDist = 280;
                particles.forEach(function(p) {
                    let target = 0;
                    if (mouseInBounds) {
                        const dx = p.x - lastLocalX;
                        const dy = p.y - lastLocalY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        target = dist < mouseLinkDist ? 0.4 * (1 - dist / mouseLinkDist) : 0;
                    }
                    p.mouseAlpha += (target - p.mouseAlpha) * EASE;
                    if (p.mouseAlpha > 0.002) {
                        ctx.strokeStyle = 'rgba(' + dotColor + ', ' + p.mouseAlpha + ')';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(lastLocalX, lastLocalY);
                        ctx.lineTo(p.x, p.y);
                        ctx.stroke();
                    }
                });

                mouseDotAlpha += ((mouseInBounds ? 0.6 : 0) - mouseDotAlpha) * EASE;
                if (mouseDotAlpha > 0.002) {
                    ctx.fillStyle = 'rgba(' + dotColor + ', ' + mouseDotAlpha + ')';
                    ctx.beginPath();
                    ctx.arc(lastLocalX, lastLocalY, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.fillStyle = 'rgba(' + dotColor + ', 0.55)';
            particles.forEach(function(p) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        function loop() {
            draw();
            animId = requestAnimationFrame(loop);
        }

        function startLoop() {
            if (!animId && !prefersReducedMotion) {
                animId = requestAnimationFrame(loop);
            }
        }

        function stopLoop() {
            if (animId) {
                cancelAnimationFrame(animId);
                animId = null;
            }
        }

        resize();
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 150);
        });

        const io = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    startLoop();
                } else {
                    stopLoop();
                }
            });
        }, { threshold: 0.01 });
        io.observe(canvas);
    });
}

// 載入淡入
window.addEventListener('load', function() {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
});

// ===== 以下為 blog.html 專用功能 =====
document.addEventListener('DOMContentLoaded', function() {
    const loadMoreBtn = document.querySelector('.load-more .btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            this.textContent = '載入中...';
            this.disabled = true;
            setTimeout(() => {
                this.textContent = '載入更多文章';
                this.disabled = false;
                showNotification('更多文章載入完成！', 'success');
            }, 2000);
        });
    }

    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', function(e) {
            e.preventDefault();
            const tagName = this.textContent;
            showNotification(`已篩選標籤: ${tagName}`, 'info');
            document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            if (!isValidEmail(email)) {
                showNotification('請輸入有效的電子郵件地址', 'error');
                return;
            }
            showNotification('訂閱成功！感謝您的關注。', 'success');
            this.reset();
        });
    }

    document.querySelectorAll('.blog-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.tagName === 'A' || e.target.closest('a')) return;
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    document.querySelectorAll('.popular-post').forEach(post => {
        post.addEventListener('click', function() {
            const title = this.querySelector('h5')?.textContent;
            showNotification(`正在載入文章: ${title}`, 'info');
        });
    });

    const filterTabs = document.querySelectorAll('.filter-tab');
    const blogCards = document.querySelectorAll('.blog-card');

    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            blogCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                if (category === 'all' || cardCategory === category) {
                    card.style.display = 'block';
                    card.style.animation = 'fadeIn 0.5s ease';
                } else {
                    card.style.display = 'none';
                }
            });

            showNotification(`已篩選: ${this.textContent}`, 'info');
        });
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            blogCards.forEach(card => {
                const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
                const content = card.querySelector('p')?.textContent.toLowerCase() || '';
                card.style.display = (title.includes(searchTerm) || content.includes(searchTerm)) ? 'block' : 'none';
            });
        });
    }

    const pageBtns = document.querySelectorAll('.page-btn');
    pageBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            pageBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            showNotification(`正在載入第 ${this.textContent} 頁...`, 'info');
        });
    });

    document.querySelectorAll('.comment').forEach(comment => {
        comment.addEventListener('click', function() {
            const author = this.querySelector('h6')?.textContent;
            showNotification(`查看 ${author} 的完整評論`, 'info');
        });
    });
});

// 淡入動畫（供 blog.html 篩選使用）
const fadeInStyle = document.createElement('style');
fadeInStyle.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(fadeInStyle);
