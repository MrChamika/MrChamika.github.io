// --- 3D Scene ---
(function() {
    const container = document.getElementById('canvas-container');
    if (!container) { return; }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
    scene.add(hemiLight);
    const mainLight = new THREE.DirectionalLight(0xffffff, 3);
    mainLight.position.set(3, 5, 4);
    scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0xffaa88, 1);
    fillLight.position.set(-3, 1, -2);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x88aaff, 0.8);
    rimLight.position.set(0, -2, -4);
    scene.add(rimLight);

    const jacketGroup = new THREE.Group();
    scene.add(jacketGroup);

    // Lazy load the 10.7 MB model only when container is visible
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            const loader = new THREE.GLTFLoader();
            loader.load('jacket.glb', (gltf) => {
                updateProgress(100);
                const model = gltf.scene;

                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const s = maxDim > 0 ? 3.0 / maxDim : 1;

                const centerMat = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
                const scaleMat = new THREE.Matrix4().makeScale(s, s, s);

                model.traverse((child) => {
                    if (!child.isMesh) return;

                    child.updateWorldMatrix(true, false);
                    const worldMat = child.matrixWorld.clone();

                    const finalMat = new THREE.Matrix4().copy(worldMat);
                    finalMat.premultiply(centerMat);
                    finalMat.premultiply(scaleMat);

                    const geo = child.geometry.clone();
                    const pos = geo.getAttribute('position');
                    if (pos) {
                        const vec = new THREE.Vector3();
                        for (let i = 0; i < pos.count; i++) {
                            vec.fromBufferAttribute(pos, i);
                            vec.applyMatrix4(finalMat);
                            pos.setXYZ(i, vec.x, vec.y, vec.z);
                        }
                        pos.needsUpdate = true;
                        geo.computeVertexNormals();
                    }

                    if (child.material) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        const newMats = mats.map(m => {
                            const nm = m.clone();
                            nm.transparent = false;
                            nm.opacity = 1;
                            return nm;
                        });
                        const mesh = new THREE.Mesh(geo, newMats.length === 1 ? newMats[0] : newMats);
                        mesh.frustumCulled = false;
                        jacketGroup.add(mesh);
                    }
                });

                window.dispatchEvent(new CustomEvent('model-ready'));
            }, (xhr) => {
                var total = xhr.total || 10695828;
                    var pct = Math.round((xhr.loaded / total) * 100);
                    window.dispatchEvent(new CustomEvent('model-progress', { detail: pct }));
                }
            }, () => {
                window.dispatchEvent(new CustomEvent('model-ready'));
            });
        });
    }, { threshold: 0 });
    observer.observe(container);

    const clock = new THREE.Clock();
    function getYOffset() {
        return window.innerWidth < 768 ? 0.6 : 0;
    }
    function animate() {
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        jacketGroup.rotation.y += (Math.sin(t * 0.3) * Math.PI - jacketGroup.rotation.y) * 0.04;
        jacketGroup.position.y = getYOffset() + Math.sin(t * 0.5) * 0.05;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();




