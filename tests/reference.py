"""
GEN436 - Valeurs de reference pour valider docs/js/model.js.

Implementation INDEPENDANTE du modele (numpy/scipy, arithmetique complexe et solveurs
generiques) : les equations de phaseurs sont posees telles qu'ecrites dans les notes de
cours, puis resolues numeriquement, sans reprendre les formules fermees du code JS.

    python tests/reference.py        ->  ecrit tests/reference.js

Convention generateur, Vs = Vs<0, grandeurs en pu :
    E<delta = Vs + Rs*I + j*Xd*Isd + j*Xq*Isq
    Isq = composante de I sur l'axe q (direction de E), Isd = composante sur l'axe d
    (en avance de 90 deg sur q).
"""
import json
import os

import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import brentq, fsolve

rng = np.random.default_rng(436)


def current_from_E(Xd, Xq, Rs, Vs, E, d):
    """Resout l'equation de phaseurs pour I (inconnues : composantes q et d)."""
    uq = np.exp(1j * d)
    ud = 1j * uq
    # E*uq - Vs = iq*(Rs*uq + j*Xq*uq) + id*(Rs*ud + j*Xd*ud)
    cq = Rs * uq + 1j * Xq * uq
    cd = Rs * ud + 1j * Xd * ud
    rhs = E * uq - Vs
    A = np.array([[cq.real, cd.real], [cq.imag, cd.imag]])
    iq, id_ = np.linalg.solve(A, np.array([rhs.real, rhs.imag]))
    return iq * uq + id_ * ud, iq, id_


def airgap_power(Xd, Xq, Rs, Vs, E, d):
    I, _, _ = current_from_E(Xd, Xq, Rs, Vs, E, d)
    return (Vs * np.conj(I)).real + Rs * abs(I) ** 2


def quantities(Xd, Xq, Rs, Vs, E, d, I):
    S = Vs * np.conj(I)
    return {
        "Vs": float(Vs), "E": float(E), "delta": float(d),
        "Ire": float(I.real), "Iim": float(I.imag),
        "Ps": float(S.real), "Qs": float(S.imag),
        "PE": float(S.real + Rs * abs(I) ** 2),
        # puissance reactive fournie par la source E : Im(E * conj(I))
        "QE": float((E * np.exp(1j * d) * np.conj(I)).imag),
    }


def stable_delta(Xd, Xq, Rs, Vs, E, P):
    """Angle stable (dP/d(delta) > 0) le plus proche de 0 tel que PE(delta) = P."""
    f = lambda d: airgap_power(Xd, Xq, Rs, Vs, E, d) - P
    grid = np.linspace(-np.pi, np.pi, 3601)
    vals = np.array([f(d) for d in grid])
    roots = []
    for a, b, fa, fb in zip(grid[:-1], grid[1:], vals[:-1], vals[1:]):
        if fa < 0 <= fb:  # passage croissant par zero
            roots.append(brentq(f, a, b, xtol=1e-14))
    if not roots:
        return None
    return min(roots, key=abs)


def E_delta_from_terminal(Xd, Xq, Rs, Vs, I):
    """Inconnues (E, delta) : solveur non lineaire generique sur le residu complexe."""
    def res(x):
        E, d = x
        uq = np.exp(1j * d)
        ud = 1j * uq
        iq = (I * np.conj(uq)).real
        id_ = (I * np.conj(ud)).real
        r = E * uq - (Vs + Rs * I + 1j * Xd * id_ * ud + 1j * Xq * iq * uq)
        return [r.real, r.imag]
    guess = Vs + (Rs + 1j * 0.5 * (Xd + Xq)) * I
    sol = fsolve(res, [abs(guess), np.angle(guess)], xtol=1e-12)
    assert np.hypot(*res(sol)) < 1e-10
    E, d = sol
    if E < 0:  # meme solution physique, exprimee avec E > 0
        E, d = -E, d + np.pi
    d = (d + np.pi) % (2 * np.pi) - np.pi
    return float(E), float(d)


def load_point(Xd, Xq, Rs, E, Z):
    """Charge passive Z : inconnues (Vs, Re I, Im I, delta)."""
    def res(x):
        Vs, ire, iim, d = x
        I = ire + 1j * iim
        uq = np.exp(1j * d)
        ud = 1j * uq
        iq = (I * np.conj(uq)).real
        id_ = (I * np.conj(ud)).real
        r1 = Vs - Z * I
        r2 = E * uq - (Vs + Rs * I + 1j * Xd * id_ * ud + 1j * Xq * iq * uq)
        return [r1.real, r1.imag, r2.real, r2.imag]
    I0 = E / (Z + Rs + 1j * Xd)
    V0 = Z * I0
    g = [abs(V0), (I0 * np.exp(-1j * np.angle(V0))).real, (I0 * np.exp(-1j * np.angle(V0))).imag,
         -np.angle(V0)]
    sol = fsolve(res, g, xtol=1e-12)
    assert np.linalg.norm(res(sol)) < 1e-10 and sol[0] > 0
    return sol


def random_machine(salient):
    Xd = rng.uniform(0.6, 1.6)
    Xq = Xd * rng.uniform(0.5, 0.95) if salient else Xd
    Rs = rng.choice([0.0, rng.uniform(0.005, 0.15)])
    return float(Xd), float(Xq), float(Rs)


ref = {"bus_Ed": [], "bus_EP": [], "bus_PQ": [], "load_VI": [], "load_Z": [], "swing": []}

for n in range(60):
    Xd, Xq, Rs = random_machine(n % 2 == 1)
    Vs = float(rng.uniform(0.8, 1.1))
    E = float(rng.uniform(0.3, 2.2))
    d = float(rng.uniform(-np.pi, np.pi))
    I, _, _ = current_from_E(Xd, Xq, Rs, Vs, E, d)
    ref["bus_Ed"].append({"m": [Xd, Xq, Rs], **quantities(Xd, Xq, Rs, Vs, E, d, I)})

n = 0
while n < 60:
    Xd, Xq, Rs = random_machine(n % 2 == 1)
    Vs = float(rng.uniform(0.8, 1.1))
    E = float(rng.uniform(0.6, 2.2))
    P = float(rng.uniform(-1.2, 1.2))
    d = stable_delta(Xd, Xq, Rs, Vs, E, P)
    if d is None:
        continue
    I, _, _ = current_from_E(Xd, Xq, Rs, Vs, E, d)
    ref["bus_EP"].append({"m": [Xd, Xq, Rs], "P": P, **quantities(Xd, Xq, Rs, Vs, E, d, I)})
    n += 1

for n in range(60):
    Xd, Xq, Rs = random_machine(n % 2 == 1)
    Vs = float(rng.uniform(0.8, 1.1))
    P = float(rng.uniform(-1.1, 1.1))
    Q = float(rng.uniform(-0.3, 0.9))
    I = np.conj((P + 1j * Q) / Vs)
    E, d = E_delta_from_terminal(Xd, Xq, Rs, Vs, I)
    ref["bus_PQ"].append({"m": [Xd, Xq, Rs], "P": P, "Q": Q, **quantities(Xd, Xq, Rs, Vs, E, d, I)})

for n in range(40):
    Xd, Xq, Rs = random_machine(n % 2 == 1)
    k = float(rng.uniform(0.5, 1.1))            # vitesse relative : X et E proportionnels a k
    Vs = float(rng.uniform(0.6, 1.1))
    Is = float(rng.uniform(0.05, 1.3))
    phi = float(rng.uniform(-1.2, 1.4))
    I = Is * np.exp(-1j * phi)
    E, d = E_delta_from_terminal(Xd * k, Xq * k, Rs, Vs, I)
    ref["load_VI"].append({"m": [Xd, Xq, Rs], "k": k, "Is": Is, "phi": phi,
                           **quantities(Xd * k, Xq * k, Rs, Vs, E, d, I), "ir": E / k})

for n in range(40):
    Xd, Xq, Rs = random_machine(n % 2 == 1)
    k = float(rng.uniform(0.5, 1.1))
    ir = float(rng.uniform(0.4, 1.8))
    Zm = float(10 ** rng.uniform(-0.7, 0.9))
    phi = float(rng.uniform(-0.6, 1.3))
    Z = Zm * np.exp(1j * phi)
    Vs, ire, iim, d = load_point(Xd * k, Xq * k, Rs, ir * k, Z)
    I = ire + 1j * iim
    ref["load_Z"].append({"m": [Xd, Xq, Rs], "k": k, "ir": ir, "Z": Zm, "phi": phi,
                          **quantities(Xd * k, Xq * k, Rs, Vs, ir * k, d, I)})

# Equation du mouvement : echelon de couple, integration de reference (pas adaptatif).
for n in range(6):
    Xd, Xq, Rs = random_machine(n % 2 == 1)
    Vs, E = 1.0, float(rng.uniform(1.0, 1.6))
    H, D = float(rng.uniform(2, 5)), float(rng.uniform(5, 25))
    P0, P1 = float(rng.uniform(0.0, 0.3)), float(rng.uniform(0.4, 0.7))
    d0 = stable_delta(Xd, Xq, Rs, Vs, E, P0)
    wn = 2 * np.pi * 60

    def rhs(t, y):
        return [wn * y[1], (P1 - airgap_power(Xd, Xq, Rs, Vs, E, y[0]) - D * y[1]) / (2 * H)]

    T = 1.5
    s = solve_ivp(rhs, [0, T], [d0, 0.0], rtol=1e-11, atol=1e-13)
    ref["swing"].append({"m": [Xd, Xq, Rs], "Vs": Vs, "E": E, "H": H, "D": D, "P0": P0, "P1": P1,
                         "T": T, "d0": float(d0), "dT": float(s.y[0, -1]), "wT": float(s.y[1, -1])})

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reference.js")
with open(out, "w", encoding="utf-8") as fh:
    fh.write("// Genere par tests/reference.py - ne pas modifier a la main.\n")
    fh.write("window.REF = " + json.dumps(ref) + ";\n")
print("ecrit", out, {key: len(v) for key, v in ref.items()})
