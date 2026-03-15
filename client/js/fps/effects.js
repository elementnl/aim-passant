const FPSEffects = (() => {
  const particles = [];

  function explode(scene, position, color) {
    const count = 12;
    const baseColor = color || 0xff4444;

    for (let i = 0; i < count; i++) {
      const size = 0.1 + Math.random() * 0.2;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshLambertMaterial({
        color: i % 3 === 0 ? baseColor : darken(baseColor, 0.3),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 8
      );

      scene.add(mesh);
      particles.push({
        mesh,
        velocity,
        life: 1.0,
        decay: 0.8 + Math.random() * 0.4,
        scene,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
      });
    }
  }

  function update(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.velocity.y -= 15 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += p.rotSpeed.x * dt;
      p.mesh.rotation.y += p.rotSpeed.y * dt;
      p.mesh.rotation.z += p.rotSpeed.z * dt;

      p.life -= p.decay * dt;
      const scale = Math.max(0, p.life);
      p.mesh.scale.setScalar(scale);

      if (p.life <= 0) {
        p.scene.remove(p.mesh);
        particles.splice(i, 1);
      }
    }
  }

  function clear(scene) {
    for (const p of particles) {
      p.scene.remove(p.mesh);
    }
    particles.length = 0;
  }

  function darken(hex, amount) {
    const r = ((hex >> 16) & 255) * (1 - amount);
    const g = ((hex >> 8) & 255) * (1 - amount);
    const b = (hex & 255) * (1 - amount);
    return (r << 16) | (g << 8) | b;
  }

  return { explode, update, clear };
})();
