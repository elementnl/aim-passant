const FPSModels = (() => {
  function createPieceModel(pieceType, color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color });
    const darkMat = new THREE.MeshLambertMaterial({ color: darken(color, 0.3) });

    const builders = { p: pawn, n: knight, b: bishop, r: rook, q: queen, k: king };
    const build = builders[pieceType] || pawn;
    build(group, mat, darkMat);

    return group;
  }

  function darken(hex, amount) {
    const r = ((hex >> 16) & 255) * (1 - amount);
    const g = ((hex >> 8) & 255) * (1 - amount);
    const b = (hex & 255) * (1 - amount);
    return (r << 16) | (g << 8) | b;
  }

  function pawn(group, mat, darkMat) {
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.2, 8), mat);
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mat);
    head.position.y = 0.88;
    group.add(head);

    const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.15, 8), darkMat);
    helmet.position.y = 1.1;
    group.add(helmet);

    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6), mat);
    armL.position.set(-0.4, 0.15, 0);
    armL.rotation.z = 0.15;
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6), mat);
    armR.position.set(0.4, 0.15, 0);
    armR.rotation.z = -0.15;
    group.add(armR);

    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6), darkMat);
    legL.position.set(-0.15, -0.9, 0);
    group.add(legL);

    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6), darkMat);
    legR.position.set(0.15, -0.9, 0);
    group.add(legR);
  }

  function knight(group, mat, darkMat) {
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 1.3, 8), mat);
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat);
    head.position.y = 0.95;
    group.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.45), darkMat);
    visor.position.set(0, 1.0, 0.12);
    group.add(visor);

    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.4), darkMat);
    crest.position.set(0, 1.3, 0);
    group.add(crest);

    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 6), darkMat);
    shield.position.set(-0.5, 0.2, 0);
    shield.rotation.z = Math.PI / 2;
    group.add(shield);

    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.7, 6), mat);
    armL.position.set(-0.45, 0.15, 0);
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.7, 6), mat);
    armR.position.set(0.45, 0.15, 0);
    armR.rotation.z = -0.2;
    group.add(armR);

    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 6), darkMat);
    legL.position.set(-0.16, -0.95, 0);
    group.add(legL);

    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 6), darkMat);
    legR.position.set(0.16, -0.95, 0);
    group.add(legR);
  }

  function bishop(group, mat, darkMat) {
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.3, 8), mat);
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mat);
    head.position.y = 0.93;
    group.add(head);

    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.35, 0.5, 8), darkMat);
    hood.position.y = 1.2;
    group.add(hood);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), darkMat);
    tip.position.y = 1.5;
    group.add(tip);

    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.5, 8), darkMat);
    robe.position.y = -0.55;
    group.add(robe);

    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6), mat);
    armL.position.set(-0.38, 0.1, 0);
    armL.rotation.z = 0.1;
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6), mat);
    armR.position.set(0.38, 0.1, 0);
    armR.rotation.z = -0.1;
    group.add(armR);
  }

  function rook(group, mat, darkMat) {
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 1.4, 8), mat);
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat);
    head.position.y = 1.0;
    group.add(head);

    const helmet = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 8), darkMat);
    helmet.position.y = 1.25;
    group.add(helmet);

    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), darkMat);
    shoulderL.position.set(-0.5, 0.55, 0);
    group.add(shoulderL);

    const shoulderR = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), darkMat);
    shoulderR.position.set(0.5, 0.55, 0);
    group.add(shoulderR);

    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.7, 6), mat);
    armL.position.set(-0.5, 0.1, 0);
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.7, 6), mat);
    armR.position.set(0.5, 0.1, 0);
    group.add(armR);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.12, 8), darkMat);
    belt.position.y = -0.1;
    group.add(belt);

    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.6, 6), darkMat);
    legL.position.set(-0.18, -1.0, 0);
    group.add(legL);

    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.6, 6), darkMat);
    legR.position.set(0.18, -1.0, 0);
    group.add(legR);
  }

  function queen(group, mat, darkMat) {
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.4, 8), mat);
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mat);
    head.position.y = 0.98;
    group.add(head);

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.2, 8), darkMat);
    crown.position.y = 1.25;
    group.add(crown);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.2, 4), darkMat);
      spike.position.set(Math.cos(angle) * 0.2, 1.45, Math.sin(angle) * 0.2);
      group.add(spike);
    }

    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.12), darkMat);
    cape.position.set(0, 0.05, -0.3);
    group.add(cape);

    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.75, 6), mat);
    armL.position.set(-0.4, 0.1, 0);
    armL.rotation.z = 0.1;
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.75, 6), mat);
    armR.position.set(0.4, 0.1, 0);
    armR.rotation.z = -0.1;
    group.add(armR);

    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6), darkMat);
    legL.position.set(-0.15, -0.95, 0);
    group.add(legL);

    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 6), darkMat);
    legR.position.set(0.15, -0.95, 0);
    group.add(legR);
  }

  function king(group, mat, darkMat) {
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.38, 1.4, 8), mat);
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mat);
    head.position.y = 0.98;
    group.add(head);

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.2, 8), darkMat);
    crown.position.y = 1.25;
    group.add(crown);

    const crossV = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6), darkMat);
    crossV.position.y = 1.55;
    group.add(crossV);

    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.07, 0.07), darkMat);
    crossH.position.y = 1.5;
    group.add(crossH);

    const mantle = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.15), darkMat);
    mantle.position.set(0, 0.2, -0.3);
    group.add(mantle);

    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.75, 6), mat);
    armL.position.set(-0.42, 0.1, 0);
    armL.rotation.z = 0.1;
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.75, 6), mat);
    armR.position.set(0.42, 0.1, 0);
    armR.rotation.z = -0.1;
    group.add(armR);

    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 6), darkMat);
    legL.position.set(-0.16, -0.95, 0);
    group.add(legL);

    const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.6, 6), darkMat);
    legR.position.set(0.16, -0.95, 0);
    group.add(legR);
  }

  return { createPieceModel };
})();
