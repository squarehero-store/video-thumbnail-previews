window.onload = function() {
    console.info('🚀 SquareHero.store Portfolio Video Thumbnails plugin loaded');

    const videoMeta = document.querySelector('meta[squarehero-plugin="portfolio-video-thumbnails"]');
    const isEnabled = videoMeta ? videoMeta.getAttribute('enabled') === 'true' : false;
    const videoTarget = videoMeta ? videoMeta.getAttribute('target') || 'video-thumbnails' : 'video-thumbnails';

    if (isEnabled) {
        (function() {
            async function fetchVideoThumbnails() {
                try {
                    const response = await fetch(`/${videoTarget}?format=json`);
                    const videoData = await response.json();
                    
                    return new Map(videoData.items.map(video => {
                        const structuredContent = video.items?.[0]?.structuredContent;
                        if (!structuredContent) return [video.urlId, null];

                        if (structuredContent._type === 'SqspHostedVideo') {
                            const alexandriaUrl = structuredContent.alexandriaUrl;
                            if (!alexandriaUrl) return [video.urlId, null];
                            const baseUrl = alexandriaUrl.replace('{variant}', '');
                            const hlsUrl = baseUrl + 'playlist.m3u8';
                            return [video.urlId, {
                                url: hlsUrl,
                                provider: 'squarespace',
                                aspectRatio: structuredContent.aspectRatio || 1.7777777777777777
                            }];
                        } else if (structuredContent.oembed) {
                            const oembed = structuredContent.oembed;
                            const provider = oembed.providerName?.toLowerCase();
                            let videoDetails = {
                                url: oembed.url,
                                provider: provider,
                                embedUrl: null,
                                aspectRatio: 1.7777777777777777
                            };

                            if (provider === 'youtube') {
                                const videoId = oembed.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^?&]+)/)?.[1];
                                if (videoId) {
                                    videoDetails.embedUrl = `https://www.youtube.com/embed/${videoId}`;
                                }
                            } else if (provider === 'vimeo') {
                                videoDetails.embedUrl = oembed.url;
                            }
                            return [video.urlId, videoDetails];
                        }
                        return [video.urlId, null];
                    }).filter(([_, value]) => value));
                } catch (error) {
                    console.error('Error fetching video data:', error);
                    return new Map();
                }
            }

            function getProjectId(href) {
                const match = href.match(/\/portfolio\/([^\/]+)/);
                return match ? match[1] : null;
            }

            function createVideoElement(videoDetails, img) {
                const videoWrapper = document.createElement('div');
                videoWrapper.className = 'video-wrapper';

                if (videoDetails.provider === 'squarespace') {
                    const video = document.createElement('video');
                    video.muted = true;
                    video.autoplay = true;
                    video.loop = true;
                    video.playsInline = true;
                    video.controls = false;

                    if (Hls.isSupported()) {
                        const hls = new Hls({
                            enableWorker: true,
                            lowLatencyMode: true
                        });
                        hls.loadSource(videoDetails.url);
                        hls.attachMedia(video);
                        hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            video.play()
                                .then(() => {
                                    if (img) img.style.opacity = '0';
                                })
                                .catch(e => console.error('Error playing video:', e));
                        });
                    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                        video.src = videoDetails.url;
                        video.addEventListener('loadedmetadata', () => {
                            video.play()
                                .then(() => {
                                    if (img) img.style.opacity = '0';
                                })
                                .catch(e => console.error('Error playing video:', e));
                        });
                    }
                    videoWrapper.appendChild(video);
                } else {
                    const iframe = document.createElement('iframe');
                    
                    if (videoDetails.provider === 'youtube') {
                        const videoId = videoDetails.embedUrl.split('/').pop();
                        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?mute=1&autoplay=1&loop=1&playlist=${videoId}&controls=0&rel=0&playsinline=1&enablejsapi=1&origin=${window.location.origin}&iv_load_policy=3&modestbranding=1&fs=0&disablekb=1&title=0&byline=0&portrait=0&showsearch=0&annotation=0`;
                        
                        iframe.addEventListener('load', () => {
                            const container = videoWrapper;
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

                            setTimeout(() => {
                                if (img) img.style.opacity = '0';
                            }, 1000);
                        });
                    } else if (videoDetails.provider === 'vimeo') {
                        const videoId = videoDetails.embedUrl.split('/').pop();
                        iframe.src = `https://player.vimeo.com/video/${videoId}?muted=1&autoplay=1&loop=1&background=1&title=0&byline=0&portrait=0`;
                    }

                    iframe.frameBorder = '0';
                    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
                    iframe.setAttribute('allowfullscreen', '');
                    
                    videoWrapper.appendChild(iframe);
                }

                return videoWrapper;
            }

            async function enhancePortfolioGrid() {
                const gridItems = document.querySelectorAll('#gridThumbs .grid-item');
                if (!gridItems.length) return;

                const videoMap = await fetchVideoThumbnails();
                
                gridItems.forEach(item => {
                    const projectId = getProjectId(item.href);
                    if (!projectId) return;

                    const videoDetails = videoMap.get(projectId);
                    if (!videoDetails) return;

                    const imageWrapper = item.querySelector('.grid-image-inner-wrapper');
                    if (!imageWrapper) return;

                    const img = imageWrapper.querySelector('img');
                    const videoElement = createVideoElement(videoDetails, img);
                    if (!videoElement) return;

                    imageWrapper.appendChild(videoElement);
                });
            }

            // Load CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/gh/squarehero-store/portfolio-video-thumbnails@0/portfolio-vide-thumbs.min.css?v=' + new Date().getTime();
            document.head.appendChild(link);

            // Load HLS.js first
            const hlsScript = document.createElement('script');
            hlsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.4.12/hls.min.js';
            hlsScript.async = true;
            
            hlsScript.onload = function() {
                if (document.readyState === 'complete') {
                    enhancePortfolioGrid();
                } else {
                    window.addEventListener('load', enhancePortfolioGrid);
                }
            };
            
            document.head.appendChild(hlsScript);
        })();
    }
};