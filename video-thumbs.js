window.onload = function() {
    console.info('🚀 SquareHero.store Video Thumbnail Previews plugin loaded');
    const videoMeta = document.querySelector('meta[squarehero-plugin="video-thumbnail-previews"]');
    const isEnabled = videoMeta ? videoMeta.getAttribute('enabled') === 'true' : false;
    const videoTarget = videoMeta ? videoMeta.getAttribute('target') || 'video-thumbnails' : 'video-thumbnails';
    const style = videoMeta ? videoMeta.getAttribute('style') : null;
    const isHoverEnabled = style === 'hover';

    if (isEnabled) {
        (function() {
            const iframeRegistry = new Map();

            function resizeIframe(iframe, container) {
                const containerWidth = container.clientWidth;
                const containerHeight = container.clientHeight;
                const videoAspectRatio = 16/9;
                
                let width = containerWidth;
                let height = containerHeight;
                
                const containerRatio = containerWidth / containerHeight;
                if (containerRatio > videoAspectRatio) {
                    width = containerHeight * videoAspectRatio;
                    if (width < containerWidth) {
                        width = containerWidth;
                        height = containerWidth / videoAspectRatio;
                    }
                } else {
                    height = containerWidth / videoAspectRatio;
                    if (height < containerHeight) {
                        height = containerHeight;
                        width = containerHeight * videoAspectRatio;
                    }
                }
                
                iframe.style.width = `${width}px`;
                iframe.style.height = `${height}px`;
            }

            function debounce(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            }

            const handleResize = debounce(() => {
                iframeRegistry.forEach((container, iframe) => {
                    resizeIframe(iframe, container);
                });
            }, 250);

            window.addEventListener('resize', handleResize);

            const LAYOUTS = {
                portfolio: {
                    container: '#gridThumbs',
                    item: '.grid-item',
                    imageWrapper: '.grid-image-inner-wrapper',
                    getProjectId: (item) => {
                        const link = item.getAttribute('href');
                        return link ? link.split('/').filter(Boolean).pop() : null;
                    }
                },
                blogBasicGrid: {
                    container: '.blog-basic-grid',
                    item: '.blog-basic-grid--container',
                    imageWrapper: '.image-wrapper',
                    getProjectId: (item) => {
                        const link = item.querySelector('.blog-more-link');
                        return link ? link.href.split('/').filter(Boolean).pop() : null;
                    }
                },
                blogSideBySide: {
                    container: '.blog-side-by-side',
                    item: '.blog-item',
                    imageWrapper: '.image-wrapper',
                    getProjectId: (item) => {
                        const link = item.querySelector('.blog-more-link');
                        return link ? link.href.split('/').filter(Boolean).pop() : null;
                    }
                },
                blogSingleColumn: {
                    container: '.blog-single-column',
                    item: '.blog-single-column--container',
                    imageWrapper: '.image-wrapper',
                    getProjectId: (item) => {
                        const link = item.querySelector('.blog-more-link');
                        return link ? link.href.split('/').filter(Boolean).pop() : null;
                    }
                },
                blogMasonry: {
                    container: '.blog-masonry',
                    item: '.blog-item',
                    imageWrapper: '.image-wrapper',
                    getProjectId: (item) => {
                        const link = item.querySelector('.blog-more-link');
                        return link ? link.href.split('/').filter(Boolean).pop() : null;
                    }
                },
                blogAlternatingSideBySide: {
                    container: '.blog-alternating-side-by-side',
                    item: '.blog-item',
                    imageWrapper: '.image-wrapper',
                    getProjectId: (item) => {
                        const link = item.querySelector('.blog-more-link');
                        return link ? link.href.split('/').filter(Boolean).pop() : null;
                    }
                },
                summaryBlock: {
                    container: '.summary-block-wrapper',
                    item: '.summary-item',
                    imageWrapper: '.summary-thumbnail-container',
                    getProjectId: (item) => {
                        const link = item.querySelector('.summary-thumbnail-container');
                        return link ? link.href.split('/').filter(Boolean).pop() : null;
                    }
                }
            };

            function detectLayout() {
                for (const [key, config] of Object.entries(LAYOUTS)) {
                    const container = document.querySelector(config.container);
                    if (container) {
                        container.dataset.layoutType = key;
                        return config;
                    }
                }
                return null;
            }

            function createVideoElement(videoDetails, img) {
                const videoWrapper = document.createElement('div');
                videoWrapper.className = 'video-wrapper';
                
                if (videoDetails.provider === 'squarespace') {
                    const video = document.createElement('video');
                    video.muted = true;
                    video.loop = true;
                    video.playsInline = true;
                    video.controls = false;
                    video.autoplay = !isHoverEnabled;

                    if (Hls.isSupported()) {
                        const hls = new Hls({
                            enableWorker: true,
                            lowLatencyMode: true
                        });

                        hls.loadSource(videoDetails.url);
                        hls.attachMedia(video);
                        
                        if (!isHoverEnabled) {
                            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                                video.play()
                                    .then(() => {
                                        if (img) img.style.opacity = '0';
                                        videoWrapper.style.opacity = '1';
                                    });
                            });
                        }
                    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = videoDetails.url;
                        if (!isHoverEnabled) {
                            video.addEventListener('loadedmetadata', () => {
                                video.play()
                                    .then(() => {
                                        if (img) img.style.opacity = '0';
                                        videoWrapper.style.opacity = '1';
                                    });
                            });
                        }
                    }
                    videoWrapper.appendChild(video);
                } else {
                    videoWrapper.classList.add('external-video');
                    const iframe = document.createElement('iframe');
                    
                    if (videoDetails.provider === 'youtube') {
                        const videoId = videoDetails.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^?&]+)/)?.[1];
                        if (videoId) {
                            iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1`;
                        }
                    } else if (videoDetails.provider === 'vimeo') {
                        const videoId = videoDetails.url.split('/').pop();
                        iframe.src = `https://player.vimeo.com/video/${videoId}?autoplay=1&loop=1&background=1`;
                    }

                    iframe.frameBorder = '0';
                    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
                    iframe.setAttribute('allowfullscreen', '');
                    
                    iframeRegistry.set(iframe, videoWrapper);
                    
                    iframe.addEventListener('load', () => {
                        resizeIframe(iframe, videoWrapper);
                        if (!isHoverEnabled) {
                            setTimeout(() => {
                                if (img) img.style.opacity = '0';
                                videoWrapper.classList.add('loaded');
                            }, 100);
                        }
                    });
                    
                    videoWrapper.appendChild(iframe);
                }

                if (isHoverEnabled) {
                    videoWrapper.classList.add('hover-enabled');
                }

                return videoWrapper;
            }

            async function enhanceMedia() {
                const layout = detectLayout();
                if (!layout) return;

                try {
                    const response = await fetch(`/${videoTarget}?format=json`);
                    const videoData = await response.json();
                    
                    const videoMap = new Map(videoData.items
                        .filter(video => video.items?.[0]?.structuredContent)
                        .map(video => {
                            const content = video.items[0].structuredContent;
                            
                            if (content._type === 'SqspHostedVideo') {
                                const url = content.alexandriaUrl?.replace('{variant}', '') + 'playlist.m3u8';
                                return [video.urlId, {
                                    url,
                                    provider: 'squarespace'
                                }];
                            } else if (content.oembed) {
                                return [video.urlId, {
                                    url: content.oembed.url,
                                    provider: content.oembed.providerName?.toLowerCase()
                                }];
                            }
                            return null;
                        })
                        .filter(Boolean)
                    );

                    document.querySelectorAll(layout.item).forEach((item) => {
                        const projectId = layout.getProjectId(item);
                        if (!projectId) return;

                        const videoDetails = videoMap.get(projectId);
                        if (!videoDetails) return;

                        const imageWrapper = item.querySelector(layout.imageWrapper);
                        if (!imageWrapper) return;

                        const img = imageWrapper.querySelector('img');
                        const videoElement = createVideoElement(videoDetails, img);
                        
                        if (isHoverEnabled) {
                            item.addEventListener('mouseenter', () => {
                                videoElement.style.opacity = '1';
                                if (img) img.style.opacity = '0';
                                const video = videoElement.querySelector('video');
                                if (video) {
                                    video.play();
                                }
                            });

                            item.addEventListener('mouseleave', () => {
                                videoElement.style.opacity = '0';
                                if (img) img.style.opacity = '1';
                                const video = videoElement.querySelector('video');
                                if (video) video.pause();
                            });
                        }

                        imageWrapper.appendChild(videoElement);
                    });
                } catch (error) {}
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/gh/squarehero-store/portfolio-video-thumbnails@0/portfolio-video-thumbs.min.css';
            document.head.appendChild(link);

            const hlsScript = document.createElement('script');
            hlsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.12/hls.min.js';
            hlsScript.async = true;
            
            hlsScript.onload = () => {
                if (document.readyState === 'complete') {
                    enhanceMedia();
                } else {
                    window.addEventListener('load', enhanceMedia);
                }
            };
            
            document.head.appendChild(hlsScript);
        })();
    }
};