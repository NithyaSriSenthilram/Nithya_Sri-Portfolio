import { useEffect, useState } from 'react'

function App() {
  const [aboutTab, setAboutTab] = useState('story')

  useEffect(() => {
    /* ── CURSOR ── */
    const cur = document.getElementById('cursor');
    const fol = document.getElementById('cursorFollower');
    let mx = 0, my = 0, fx = 0, fy = 0;

    const onMouseMove = e => {
      mx = e.clientX;
      my = e.clientY;
      if (cur) {
        cur.style.left = mx + 'px';
        cur.style.top = my + 'px';
      }
    };
    document.addEventListener('mousemove', onMouseMove);

    let animFrameCursorId;
    function animCursor() {
      fx += (mx - fx) * .12;
      fy += (my - fy) * .12;
      if (fol) {
        fol.style.left = fx + 'px';
        fol.style.top = fy + 'px';
      }
      animFrameCursorId = requestAnimationFrame(animCursor);
    }
    animCursor();

    /* ── LOADER ── */
    const bar = document.getElementById('loaderBar');
    const pct = document.getElementById('loaderPct');
    const loader = document.getElementById('loader');
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 4 + 1;
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        setTimeout(() => {
          if (loader) loader.style.opacity = '0';
          // Trigger card drop-in animation as loader fades out
          const cardWrap = document.querySelector('.id-card-wrap');
          if (cardWrap) cardWrap.classList.add('card-dropped');
          setTimeout(() => {
            if (loader) loader.style.display = 'none';
          }, 600);
        }, 300);
      }
      if (bar) bar.style.width = p + '%';
      if (pct) pct.textContent = 'LOADING EXPERIENCE... ' + Math.floor(p) + '%';
    }, 40);

    /* ── NAVBAR & PARALLAX BACKGROUND TEXT ── */
    const onScroll = () => {
      const scrollY = window.scrollY;
      const navbar = document.getElementById('navbar');
      if (navbar) {
        navbar.classList.toggle('scrolled', scrollY > 50);
      }

      const bgText = document.querySelector('.hero-bg-text');
      if (bgText) {
        const translateY = scrollY * 0.4;
        bgText.style.transform = `translate3d(-50%, ${translateY}px, 0)`;
      }
    };
    window.addEventListener('scroll', onScroll);
    onScroll();

    /* ── FADE UP ── */
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: .1 });
    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));

    /* ── BUTTERFLY — follows the cursor ── */
    const butterfly = document.getElementById('butterfly');
    const butterflySize = () => (butterfly ? (butterfly.getBoundingClientRect().width || 300) : 300);

    // where the mouse actually is
    let mouseX = window.innerWidth * 0.5;
    let mouseY = window.innerHeight * 0.35;
    let hasMouse = false;

    const onMouseMoveButterfly = e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      hasMouse = true;
    };
    document.addEventListener('mousemove', onMouseMoveButterfly);

    // also respond to touch, so it isn't frozen on mobile
    const onTouchMoveButterfly = e => {
      if (e.touches[0]) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
        hasMouse = true;
      }
    };
    document.addEventListener('touchmove', onTouchMoveButterfly, { passive: true });

    // current (smoothed) position + heading
    let curX = mouseX, curY = mouseY;
    let prevX = curX, prevY = curY;
    let angle = 0;
    let t = 0;
    let animFrameButterflyId;

    function update() {
      if (!butterfly) return;
      t += 0.016;

      const size = butterflySize();
      const wanderX = Math.sin(t * 0.9) * 18;
      const wanderY = Math.sin(t * 1.6) * 14 + Math.cos(t * 0.5) * 6;

      const targetX = mouseX - (size * 0.58) + wanderX;
      const targetY = mouseY - (size * 0.75) + wanderY;

      curX += (targetX - curX) * 0.05;
      curY += (targetY - curY) * 0.05;

      const dx = curX - prevX;
      const dy = curY - prevY;
      prevX = curX; prevY = curY;

      const desiredAngle = Math.max(-28, Math.min(28, dx * 1.1));
      angle += (desiredAngle - angle) * 0.08;

      const bob = hasMouse ? 0 : Math.sin(Date.now() / 950) * 16;

      const half = size / 2;
      butterfly.style.transform =
        `translate(${curX - half}px, ${curY - half + bob}px) rotate(${angle}deg)`;

      animFrameButterflyId = requestAnimationFrame(update);
    }

    update();

    /* ── ID CARD — rubberband pull ── */
    let resizeListener;
    let onCardPointerDown;
    let onClipPointerDown;
    let onPointerUpGlobal;
    let onPointerMoveGlobal;
    let animFrameSpringId;

    (function () {
      const clip = document.querySelector('.id-card-clip');
      const string = document.querySelector('.id-card-string');
      const card = document.querySelector('.id-card');
      if (!clip || !string || !card) return;

      const baseLength = 60;       // resting clip-to-card distance, matches string height
      const maxFreeStretch = 130;  // px of easy pull before rubber resistance kicks in
      const maxStretch = 230;      // hard cap on extra stretch beyond baseLength

      let anchorX = 0, anchorY = 0;
      let angle = 0, length = baseLength;   // current rendered state (deg, px)
      let angleVel = 0, lengthVel = 0;      // spring velocities, used after release
      let dragging = false;

      function updateAnchor() {
        const r = clip.getBoundingClientRect();
        anchorX = r.left + r.width / 2;
        anchorY = r.bottom;
      }

      function applyTransform() {
        const rad = angle * Math.PI / 180;
        const endX = length * Math.sin(rad);
        const endY = length * Math.cos(rad);

        const stretchRatio = Math.min(1, Math.max(0, (length - baseLength) / maxStretch));
        string.style.transform = `rotate(${-angle}deg) scaleY(${length / baseLength})`;
        string.style.background = stretchRatio > 0.12
          ? `linear-gradient(var(--black), var(--red))`
          : '';

        const tilt = Math.max(-35, Math.min(35, angle * 0.5));
        card.style.transform = `translate(${endX}px, ${endY - baseLength}px) rotate(${tilt}deg) scale(${1 + stretchRatio * 0.04})`;
      }

      function softClamp(rawExtra) {
        if (rawExtra <= maxFreeStretch) return rawExtra;
        const over = rawExtra - maxFreeStretch;
        return maxFreeStretch + (maxStretch - maxFreeStretch) * (1 - Math.exp(-over / 90));
      }

      onPointerMoveGlobal = function (e) {
        if (!dragging) return;
        const dx = e.clientX - anchorX;
        const dy = e.clientY - anchorY;
        const rawLength = Math.sqrt(dx * dx + dy * dy);
        const targetAngle = Math.atan2(dx, dy) * 180 / Math.PI;
        const targetLength = baseLength + softClamp(Math.max(0, rawLength - baseLength));

        angle += (targetAngle - angle) * 0.45;
        length += (targetLength - length) * 0.45;

        applyTransform();
      };

      function startSpringBack() {
        angleVel = 0;
        lengthVel = 0;
        const stiffness = 0.16;
        const damping = 0.78;

        function step() {
          if (dragging) return;

          angleVel = (angleVel - angle * stiffness) * damping;
          angle += angleVel;

          lengthVel = (lengthVel - (length - baseLength) * stiffness) * damping;
          length += lengthVel;

          applyTransform();

          const settled = Math.abs(angle) < 0.05 && Math.abs(angleVel) < 0.05 &&
            Math.abs(length - baseLength) < 0.1 && Math.abs(lengthVel) < 0.05;

          if (!settled) {
            animFrameSpringId = requestAnimationFrame(step);
          } else {
            angle = 0; length = baseLength;
            string.style.background = '';
            string.style.transform = '';
            card.style.transform = '';
            card.style.animation = '';
          }
        }
        animFrameSpringId = requestAnimationFrame(step);
      }

      const onPointerDown = function (e) {
        dragging = true;
        updateAnchor();
        card.classList.add('dragging');
        card.style.animation = 'none';
        document.addEventListener('pointermove', onPointerMoveGlobal);
        document.addEventListener('pointerup', onPointerUpGlobal);
        document.addEventListener('pointercancel', onPointerUpGlobal);
        e.preventDefault();
      };

      onPointerUpGlobal = function () {
        if (!dragging) return;
        dragging = false;
        card.classList.remove('dragging');
        document.removeEventListener('pointermove', onPointerMoveGlobal);
        document.removeEventListener('pointerup', onPointerUpGlobal);
        document.removeEventListener('pointercancel', onPointerUpGlobal);
        startSpringBack();
      };

      onCardPointerDown = onPointerDown;
      onClipPointerDown = onPointerDown;

      card.addEventListener('pointerdown', onCardPointerDown);
      clip.addEventListener('pointerdown', onClipPointerDown);

      resizeListener = updateAnchor;
      window.addEventListener('resize', resizeListener);
      updateAnchor();
    })();

    // CLEANUP ON UNMOUNT
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animFrameCursorId);
      clearInterval(iv);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mousemove', onMouseMoveButterfly);
      document.removeEventListener('touchmove', onTouchMoveButterfly);
      cancelAnimationFrame(animFrameButterflyId);
      obs.disconnect();

      const clip = document.querySelector('.id-card-clip');
      const card = document.querySelector('.id-card');
      if (clip && onClipPointerDown) {
        clip.removeEventListener('pointerdown', onClipPointerDown);
      }
      if (card && onCardPointerDown) {
        card.removeEventListener('pointerdown', onCardPointerDown);
      }
      if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
      }
      if (onPointerMoveGlobal) {
        document.removeEventListener('pointermove', onPointerMoveGlobal);
      }
      if (onPointerUpGlobal) {
        document.removeEventListener('pointerup', onPointerUpGlobal);
        document.removeEventListener('pointercancel', onPointerUpGlobal);
      }
      if (animFrameSpringId) {
        cancelAnimationFrame(animFrameSpringId);
      }
    };
  }, []);

  return (
    <>
      <div className="cursor" id="cursor"></div>
      <div className="cursor-follower" id="cursorFollower"></div>

      {/* BUTTERFLY — standalone component */}
      <div id="butterfly-layer">
        <svg id="butterfly" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wingGradR" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0d1410" />
              <stop offset="35%" stopColor="#13262a" />
              <stop offset="55%" stopColor="#19b8c9" />
              <stop offset="75%" stopColor="#0d2d33" />
              <stop offset="100%" stopColor="#070707" />
            </linearGradient>
            <linearGradient id="wingGradL" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0d1410" />
              <stop offset="35%" stopColor="#13262a" />
              <stop offset="55%" stopColor="#19b8c9" />
              <stop offset="75%" stopColor="#0d2d33" />
              <stop offset="100%" stopColor="#070707" />
            </linearGradient>
          </defs>

          {/* right wings */}
          <g className="wing-right" style={{ transformBox: 'fill-box' }}>
            <path d="M100,98 C150,55 198,55 198,80 C198,100 165,108 145,100 C168,118 185,142 162,158 C140,172 112,148 100,122 Z"
              fill="url(#wingGradR)" stroke="#000" strokeWidth="0.6" />
            <path d="M100,98 C150,55 198,55 198,80" fill="none" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.5" />
            <path d="M100,122 C130,140 150,148 162,158" fill="none" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.5" />
            <path d="M150,160 C160,168 168,178 160,184 C152,188 144,178 145,168 Z" fill="#0c0c0c" />
          </g>

          {/* left wings */}
          <g className="wing-left" style={{ transformBox: 'fill-box' }}>
            <path d="M100,98 C50,55 2,55 2,80 C2,100 35,108 55,100 C32,118 15,142 38,158 C60,172 88,148 100,122 Z"
              fill="url(#wingGradL)" stroke="#000" strokeWidth="0.6" />
            <path d="M100,98 C50,55 2,55 2,80" fill="none" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.5" />
            <path d="M100,122 C70,140 50,148 38,158" fill="none" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.5" />
            <path d="M50,160 C40,168 32,178 40,184 C48,188 56,178 55,168 Z" fill="#0c0c0c" />
          </g>

          {/* body */}
          <ellipse cx="100" cy="105" rx="5" ry="32" fill="#0a0a0a" />
          <circle cx="100" cy="76" r="6" fill="#0a0a0a" />
          <path d="M97,71 C92,60 86,56 81,54" fill="none" stroke="#0a0a0a" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M103,71 C108,60 114,56 119,54" fill="none" stroke="#0a0a0a" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>

      {/* LOADER */}
      <div id="loader">
        <div className="loader-name">NITHYA<span>.</span></div>
        <div className="loader-bar-wrap"><div className="loader-bar" id="loaderBar"></div></div>
        <div className="loader-pct" id="loaderPct">LOADING EXPERIENCE... 0%</div>
      </div>

      {/* NAV */}
      <nav id="navbar">
        <a href="#hero" className="nav-logo">NITHYA SRI<span>.</span></a>
        <ul className="nav-links">
          <li><a href="#about">About</a></li>
          <li><a href="#education">Education</a></li>
          <li><a href="#experience">Experience</a></li>
          <li><a href="#skills">Skills</a></li>
          <li><a href="#projects">Projects</a></li>
          <li><a href="#certifications">Certifications</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>

      {/* HERO */}
      <section id="hero">
        <img src="/f2_nobg.png" alt="Flower Left" className="hero-flower-img left" />
        <img src="/f3_nobg.png" alt="Flower Right" className="hero-flower-img right" />
        <div className="id-card-wrap">
          <div className="id-card-clip"></div>
          <div className="id-card-string"></div>
          <div className="id-card">
            <div className="id-card-spacer"></div>
            <div className="id-card-photo-placeholder">
              <img src="/img.jpeg" alt="Nithya Sri" className="id-card-photo" />
            </div>
            <div className="id-card-field">
              <span className="id-card-field-label">Name</span>
              <span className="id-card-field-value">Nithya Sri</span>
            </div>
            <div className="id-card-field">
              <span className="id-card-field-label">Role</span>
              <span className="id-card-field-value">Computer Science Student</span>
            </div>
          </div>
        </div>
        <div className="hero-bg-text">PORTFOLIO</div>
        <div className="hero-tags">
          <span className="hero-tag">Computer Science Student</span>
          <span className="hero-tag">Full-Stack Developer</span>
          <span className="hero-tag">B.E. Computer Science · 2023–2027</span>
        </div>
        <div className="hero-scroll">Scroll to explore</div>
      </section>

      {/* ABOUT */}
      <section id="about">
        <div className="about-glows">
          <div className="about-glow glow-1"></div>
          <div className="about-glow glow-2"></div>
        </div>
        <div className="about-grid">
          <div className="about-left fade-up">
            <div className="section-heading">about<br />me.</div>
            <div className="about-flower-container">
              <img src="/f4_nobg.png" alt="Flower Decorative" className="about-flower" />
            </div>
          </div>
          <div className="about-right fade-up">
            <div className="about-tags">
              <span className="about-tag">Computer Science</span>
              <span className="about-tag">Full-Stack Development</span>
              <span className="about-tag">Problem Solver</span>
              <span className="about-tag">Tamil Nadu, India</span>
            </div>

            <div className="about-tabs-nav">
              <button
                className={`about-tab-btn ${aboutTab === 'story' ? 'active' : ''}`}
                onClick={() => setAboutTab('story')}
              >
                📖 My Story
              </button>
              <button
                className={`about-tab-btn ${aboutTab === 'skills' ? 'active' : ''}`}
                onClick={() => setAboutTab('skills')}
              >
                🛠️ Core Skills
              </button>
              <button
                className={`about-tab-btn ${aboutTab === 'philosophy' ? 'active' : ''}`}
                onClick={() => setAboutTab('philosophy')}
              >
                💡 Philosophy
              </button>
            </div>

            {aboutTab === 'story' && (
              <div className="about-tab-content active">
                <div className="story-card">
                  <div className="about-greeting">nice to meet you!</div>
                  <p className="about-text">
                    I'm Nithya Sri, a Computer Science student at Ramco Institute of Technology with a CGPA of 8.3/10. I enjoy solving problems, collaborating with others, and building practical applications with modern web technologies.
                  </p>
                  <p className="about-text faded">
                    Through independent projects and an Android app development internship, I've gained hands-on experience across frontend, backend, databases, and mobile development. I'm eager to contribute to real-world projects and keep learning.
                  </p>
                </div>
              </div>
            )}

            {aboutTab === 'skills' && (
              <div className="about-tab-content active">
                <div className="about-greeting">tools of the trade</div>
                <div className="skills-grid">
                  <div className="skill-card">
                    <span className="skill-icon">☕</span>
                    <span className="skill-name">Java</span>
                  </div>
                  <div className="skill-card">
                    <span className="skill-icon">⚛️</span>
                    <span className="skill-name">React</span>
                  </div>
                  <div className="skill-card">
                    <span className="skill-icon">🐍</span>
                    <span className="skill-name">Python</span>
                  </div>
                  <div className="skill-card">
                    <span className="skill-icon">🗄️</span>
                    <span className="skill-name">SQL</span>
                  </div>
                  <div className="skill-card">
                    <span className="skill-icon">🌐</span>
                    <span className="skill-name">HTML &amp; CSS</span>
                  </div>
                  <div className="skill-card">
                    <span className="skill-icon">📱</span>
                    <span className="skill-name">Android Studio</span>
                  </div>
                </div>
              </div>
            )}

            {aboutTab === 'philosophy' && (
              <div className="about-tab-content active">
                <div className="about-greeting">what drives me</div>
                <div className="philosophy-list">
                  <div className="philosophy-card">
                    <div className="philosophy-title">👤 User-First Approach</div>
                    <div className="philosophy-desc">Design starts and ends with the user's needs, behaviors, and emotions. Products must not only work, but feel natural and delightful.</div>
                  </div>
                  <div className="philosophy-card">
                    <div className="philosophy-title">✨ Pixel Perfect Details</div>
                    <div className="philosophy-desc">Every detail matters — from micro-interactions to visual rhythm, typography alignment, and responsive scalability.</div>
                  </div>
                  <div className="philosophy-card">
                    <div className="philosophy-title">🚀 Continuous Iteration</div>
                    <div className="philosophy-desc">Building is an ongoing journey of learning, prototyping, testing, and refining to build better solutions.</div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* TECHNICAL SKILLS */}
      <section id="skills">
        <div className="services-parallax-wrap">
          {[
            {
              num: '01',
              title: 'LANGUAGES',
              items: ['Java', 'C', 'Python', 'SQL'],
              flower: '/f1_nobg.png'
            },
            {
              num: '02',
              title: 'WEB DEVELOPMENT',
              items: ['HTML5 & CSS3', 'React.js', 'Node.js', 'Express.js'],
              flower: '/f6 Background Removed.png'
            },
            {
              num: '03',
              title: 'DATABASES & MOBILE',
              items: ['MongoDB', 'Firebase', 'Android Studio', 'XML layouts'],
              flower: '/f7 Background Removed.png'
            },
            {
              num: '04',
              title: 'TOOLS & PLATFORMS',
              items: ['Git & GitHub', 'Figma', 'Vercel', 'Netlify'],
              flower: '/b1.png'
            }
          ].map((svc, i) => {
            const curvePaths = [
              // Card 1 — sweeps right, makes right-side loop, ends center-bottom
              "M 500,0 C 580,80 820,120 860,260 C 900,400 820,460 720,480 C 620,500 560,460 540,540 C 510,640 600,720 620,820 C 640,920 540,970 500,1000",
              // Card 2 — sweeps left, makes left-side loop, ends center-bottom
              "M 500,0 C 420,80 180,120 140,260 C 100,400 180,460 280,480 C 380,500 440,460 460,540 C 490,640 400,720 380,820 C 360,920 460,970 500,1000",
              // Card 3 — sweeps right with tighter loop
              "M 500,0 C 600,60 820,160 840,300 C 860,440 760,510 680,530 C 580,555 520,510 500,580 C 470,670 560,760 540,860 C 520,940 505,970 500,1000",
              // Card 4 — sweeps left with tighter loop
              "M 500,0 C 400,60 180,160 160,300 C 140,440 240,510 320,530 C 420,555 480,510 500,580 C 530,670 440,760 460,860 C 480,940 495,970 500,1000",
            ];
            return (
              <div className="service-parallax-item" key={i} data-index={i}>
                {/* Curved connector line */}
                <svg
                  className="service-curve-line"
                  viewBox="0 0 1000 1000"
                  preserveAspectRatio="xMidYMid meet"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d={curvePaths[i]}
                    stroke="#1a1a1a"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {i === 1 || i === 3 ? (
                  <>
                    <div className="service-parallax-right service-parallax-right--left">
                      <div className="service-parallax-card">
                        <div className="service-num">{svc.num}</div>
                        <div className="service-title">{svc.title}</div>
                        <div className="service-divider"></div>
                        <ul className="service-list">
                          {svc.items.map((item, j) => <li key={j}>{item}</li>)}
                        </ul>
                      </div>
                    </div>
                    <div className="service-parallax-left">
                      <img src={svc.flower} alt="" className="service-parallax-flower" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="service-parallax-left">
                      {i === 0 && (
                        <div className="services-inline-label">
                          <div className="section-eyebrow">My Toolkit</div>
                          <div className="section-heading">TECHNICAL SKILLS</div>
                        </div>
                      )}
                      <img src={svc.flower} alt="" className="service-parallax-flower" />
                    </div>
                    <div className="service-parallax-right">
                      <div className="service-parallax-card">
                        <div className="service-num">{svc.num}</div>
                        <div className="service-title">{svc.title}</div>
                        <div className="service-divider"></div>
                        <ul className="service-list">
                          {svc.items.map((item, j) => <li key={j}>{item}</li>)}
                        </ul>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* EDUCATION */}
      <section id="education">
        <div className="experience-inner">
          <div className="experience-header fade-up">
            <div>
              <div className="section-eyebrow">Academic Background</div>
              <div className="section-heading">EDUCATION</div>
            </div>
          </div>
          <div className="timeline">
            <div className="timeline-item fade-up">
              <div className="timeline-dot"></div>
              <div>
                <div className="timeline-duration">Sep 2023 – May 2027</div>
                <div className="timeline-type">Undergraduate</div>
              </div>
              <div>
                <div className="timeline-role">Bachelor of Engineering, Computer Science</div>
                <div className="timeline-company">Ramco Institute of Technology · Rajapalayam, Tamil Nadu</div>
                <p className="timeline-desc">Current CGPA: 8.3/10</p>
              </div>
            </div>
            <div className="timeline-item fade-up">
              <div className="timeline-dot"></div>
              <div>
                <div className="timeline-duration">2022 – 2023</div>
                <div className="timeline-type">Higher Secondary</div>
              </div>
              <div>
                <div className="timeline-role">HSC · 86%</div>
                <div className="timeline-company">Sivanandha Vidyalayam Matric Higher Secondary School · Aruppukottai, Tamil Nadu</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EXPERIENCE */}
      <section id="experience">
        <div className="experience-inner">
          <div className="experience-header fade-up">
            <div>
              <div className="section-eyebrow">Professional Experience</div>
              <div className="section-heading">INTERNSHIP</div>
            </div>
            <div className="experience-summary">Hands-on Android app development experience at Hitasoft Technology Solutions.</div>
          </div>
          <div className="timeline">
            <div className="timeline-item fade-up">
              <div className="timeline-dot"></div>
              <div>
                <div className="timeline-duration">Jul 2025</div>
                <div className="timeline-type">Internship</div>
              </div>
              <div>
                <div className="timeline-role">Android App Development Intern</div>
                <div className="timeline-company">Hitasoft Technology Solutions Pvt Limited · Madurai</div>
                <p className="timeline-desc">Designed Android interfaces with XML and implemented key application features and navigation.</p>
                <ul className="timeline-bullets">
                  <li>Designed UI screens and implemented a splash screen using XML</li>
                  <li>Worked with conditional logic, Intents, and Fragments</li>
                  <li>Implemented Bottom Navigation and SharedPreferences for data storage</li>
                  <li>Integrated WebView to display web content</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section id="projects">
        <div className="projects-inner">
          <div className="projects-heading-wrap fade-up">
            <div className="section-eyebrow">Selected Work</div>
            <div className="section-heading">PROJECTS</div>
          </div>
          <div className="project-card fade-up">
            <div className="project-card-banner banner-1"><span style={{ fontSize: '5rem' }}>📡</span><div className="project-year-badge">MERN</div></div>
            <div className="project-card-body">
              <div className="project-meta"><div className="project-num" style={{ color: 'var(--red)' }}>01</div><div className="project-category-badge">Full-Stack Application</div></div>
              <div className="project-title">Telecom Billing System</div>
              <p className="project-desc">Built a telecom billing application with JWT authentication and role-based access control. Includes plan management, recharges, call/SMS/data usage tracking, and automated bill generation.</p>
              <div className="project-tags"><span className="project-tag">React</span><span className="project-tag">Node.js</span><span className="project-tag">Express</span><span className="project-tag">MongoDB</span><span className="project-tag">JWT</span></div>
              <div className="project-links"><span className="project-link">Secure billing &amp; usage management</span><div className="project-arrow">↗</div></div>
            </div>
          </div>
          <div className="project-card fade-up">
            <div className="project-card-banner banner-2"><span style={{ fontSize: '5rem' }}>🧠</span><div className="project-year-badge" style={{ background: '#5c6bc0' }}>AI</div></div>
            <div className="project-card-body">
              <div className="project-meta"><div className="project-num" style={{ color: '#5c6bc0' }}>02</div><div className="project-category-badge">AI · Recruitment</div></div>
              <div className="project-title">AI Resume Screening</div>
              <p className="project-desc">Created a recruitment platform that compares resumes with job descriptions using TF-IDF and cosine similarity, computes match scores, and highlights matched and missing skills. Includes recruiter login, uploads, and screening reports.</p>
              <div className="project-tags"><span className="project-tag">React</span><span className="project-tag">Node.js</span><span className="project-tag">MongoDB</span><span className="project-tag">Python</span><span className="project-tag">Flask</span></div>
              <div className="project-links"><span className="project-link">NLP-powered candidate analysis</span><div className="project-arrow" style={{ background: '#5c6bc0' }}>↗</div></div>
            </div>
          </div>
          <div className="project-card fade-up">
            <div className="project-card-banner banner-3"><span style={{ fontSize: '5rem' }}>🎓</span><div className="project-year-badge" style={{ background: '#1e88e5' }}>PDF</div></div>
            <div className="project-card-body">
              <div className="project-meta"><div className="project-num" style={{ color: '#1e88e5' }}>03</div><div className="project-category-badge">Full-Stack · Productivity</div></div>
              <div className="project-title">Certification Generator</div>
              <p className="project-desc">Developed a certificate management application with customizable templates, dynamic text fields, and live previews. REST APIs support certificate processing and PDF generation/downloads.</p>
              <div className="project-tags"><span className="project-tag">React</span><span className="project-tag">Node.js</span><span className="project-tag">Express</span><span className="project-tag">MongoDB</span><span className="project-tag">PDF</span></div>
              <div className="project-links"><span className="project-link">Custom templates &amp; PDF downloads</span><div className="project-arrow" style={{ background: '#1e88e5' }}>↗</div></div>
            </div>
          </div>
          <div className="project-card fade-up">
            <div className="project-card-banner banner-4"><span style={{ fontSize: '5rem' }}>🦺</span><div className="project-year-badge" style={{ background: '#f9a825', color: '#333' }}>AI</div></div>
            <div className="project-card-body">
              <div className="project-meta"><div className="project-num" style={{ color: '#f9a825' }}>04</div><div className="project-category-badge">AI · Computer Vision · Site Safety</div></div>
              <div className="project-title">SentinelVision AI</div>
              <p className="project-desc">Built an AI-powered CCTV safety-monitoring system that detects and tracks people with stable identities, checks PPE compliance, and flags restricted-area intrusion, loitering, abnormal movement, possible falls, and crowd anomalies. Incidents include snapshot and video evidence, with real-time alerts and historical search.</p>
              <p className="project-desc">The diagnostics API reports the inference backend actually running, why alternatives are unavailable, whether Mojo kernels are active, and whether PPE status comes from a trained model or a clearly labelled colour heuristic.</p>
              <div className="project-tags"><span className="project-tag">AI</span><span className="project-tag">Computer Vision</span><span className="project-tag">YOLO</span><span className="project-tag">ONNX Runtime</span><span className="project-tag">ByteTrack</span><span className="project-tag">WebSockets</span></div>
              <div className="project-links"><a href="https://github.com/NithyaSriSenthilram/PPE_Violation_detection" className="project-link" target="_blank" rel="noreferrer">View project on GitHub ↗</a><div className="project-arrow" style={{ background: '#f9a825' }}>↗</div></div>
            </div>
          </div>
          <div className="project-card fade-up">
            <div className="project-card-banner banner-5"><span style={{ fontSize: '5rem' }}>🌱</span><div className="project-year-badge" style={{ background: '#43a047' }}>IoT</div></div>
            <div className="project-card-body">
              <div className="project-meta"><div className="project-num" style={{ color: '#43a047' }}>05</div><div className="project-category-badge">IoT · Smart Agriculture</div></div>
              <div className="project-title">Smart Farming Dashboard</div>
              <p className="project-desc">Built a responsive real-time IoT dashboard for monitoring temperature, humidity, soil moisture, light intensity, pH, and atmospheric pressure, with interactive charts and manual sensor-data entry.</p>
              <p className="project-desc">Includes crop- and soil-based fertilizer and pesticide advisors, secure JWT authentication, and farm management for farms, field blocks, crop assignments, and deployed sensors.</p>
              <div className="project-tags"><span className="project-tag">React 19</span><span className="project-tag">Node.js</span><span className="project-tag">Express</span><span className="project-tag">MongoDB</span><span className="project-tag">Socket.io</span><span className="project-tag">Chart.js</span></div>
              <div className="project-links"><a href="https://github.com/NithyaSriSenthilram/Smart-Farming-Dashboard" className="project-link" target="_blank" rel="noreferrer">View project on GitHub ↗</a><div className="project-arrow" style={{ background: '#43a047' }}>↗</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* CERTIFICATIONS & ACHIEVEMENTS */}
      <section id="certifications">
        <div className="experience-inner">
          <div className="experience-header fade-up">
            <div>
              <div className="section-eyebrow">Learning &amp; Recognition</div>
              <div className="section-heading">CERTIFICATIONS &amp; ACHIEVEMENTS</div>
            </div>
          </div>
          <div className="timeline">
            <div className="timeline-item fade-up">
              <div className="timeline-dot"></div>
              <div>
                <div className="timeline-type">NPTEL</div>
              </div>
              <div>
                <div className="timeline-role">Programming in Java</div>
                <div className="timeline-company">NPTEL Certification</div>
              </div>
            </div>
            <div className="timeline-item fade-up">
              <div className="timeline-dot"></div>
              <div>
                <div className="timeline-type">NPTEL</div>
              </div>
              <div>
                <div className="timeline-role">Cloud Computing</div>
                <div className="timeline-company">NPTEL Certification</div>
              </div>
            </div>
            <div className="timeline-item fade-up">
              <div className="timeline-dot"></div>
              <div>
                <div className="timeline-type">NPTEL</div>
              </div>
              <div>
                <div className="timeline-role">Introduction to Internet of Things</div>
                <div className="timeline-company">NPTEL Certification</div>
              </div>
            </div>
            <div className="timeline-item fade-up">
              <div className="timeline-dot"></div>
              <div>
                <div className="timeline-type">Infosys Springboard</div>
              </div>
              <div>
                <div className="timeline-role">Artificial Intelligence</div>
                <div className="timeline-company">Infosys Springboard Certification</div>
              </div>
            </div>
            <div className="timeline-item fade-up">
              <div className="timeline-dot"></div>
              <div>
                <div className="timeline-type">UiPath Academy</div>
              </div>
              <div>
                <div className="timeline-role">Agentic Automation Developer Associate Training</div>
                <div className="timeline-company">UiPath Academy</div>
              </div>
            </div>
            <div className="timeline-item fade-up">
              <div className="timeline-dot"></div>
              <div>
                <div className="timeline-type">3rd Prize</div>
              </div>
              <div>
                <div className="timeline-role">Virtual Hackathon</div>
                <div className="timeline-company">GDG On Campus · Ramco Institute of Technology</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact">
        <div className="contact-inner">
          <div className="fade-up" style={{ textAlign: 'center' }}>
            <div className="section-eyebrow" style={{ textAlign: 'center' }}>Let's Talk</div>
            <div className="section-heading" style={{ textAlign: 'center', marginBottom: '16px' }}>CONTACT</div>
            <p className="contact-sub">I'm eager to contribute to real-world projects and connect with people building useful technology.</p>
          </div>
          <div className="contact-content-wrap fade-up">
            <div className="contact-email-container">
              <a href="mailto:nithyasrisenthilram03@gmail.com" className="contact-email-link">
                nithyasrisenthilram03@gmail.com
                <span className="email-arrow"> ↗</span>
              </a>
            </div>
            
            <div className="contact-details-grid">
              <div className="contact-detail-col">
                <div className="contact-detail-label">Phone &amp; Location</div>
                <div className="contact-detail-value">+91 70105 23837</div>
                <div className="contact-detail-sub">Tamil Nadu, India</div>
              </div>
              
              <div className="contact-detail-col">
                <div className="contact-detail-label">Follow Me</div>
                <div className="contact-social-links">
                  <a href="https://www.linkedin.com/in/nithya-sri-s-profile" className="contact-social-link-min" target="_blank" rel="noreferrer">LinkedIn</a>
                  <a href="https://github.com/NithyaSriSenthilram" className="contact-social-link-min" target="_blank" rel="noreferrer">GitHub</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-name">Nithya Sri.</div>
              <div className="footer-tagline">Computer Science student building full-stack and AI-powered applications.</div>
            </div>
            <a href="#contact" className="footer-cta">LET'S CONNECT →</a>
          </div>
          <ul className="footer-nav">
            <li><a href="#projects">Projects</a></li>
            <li><a href="#education">Education</a></li>
            <li><a href="#experience">Internship</a></li>
            <li><a href="#skills">Skills</a></li>
            <li><a href="#certifications">Certifications</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
          <div className="footer-bottom">
            <div className="footer-copyright">© 2026 Nithya Sri. All rights reserved.</div>
            <ul className="footer-socials">
              <li><a href="https://www.linkedin.com/in/nithya-sri-s-profile" target="_blank" rel="noreferrer">LinkedIn</a></li>
              <li><a href="https://github.com/NithyaSriSenthilram" target="_blank" rel="noreferrer">GitHub</a></li>
            </ul>
          </div>
          <div className="footer-watermark"><div className="footer-watermark-text">NITHYA SRI</div></div>
        </div>
      </footer>
    </>
  )
}

export default App
