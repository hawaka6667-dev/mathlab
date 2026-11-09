import numpy as np
import matplotlib.pyplot as plt

def generate_plot():
    # Set style
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
    fig, ax = plt.subplots(figsize=(8, 5.5), dpi=300)

    # Domain
    x = np.linspace(0.04, 6.0, 1000)
    y = 1.0 / np.sqrt(x)

    # Plot main curve
    ax.plot(x, y, color='#0284c7', linewidth=2.5, label=r'$f(x) = \frac{1}{\sqrt{x}}$')

    # Key points: (0.25, 2), (1, 1), (4, 0.5)
    key_points = [(0.25, 2.0, r'$(1/4, 2)$'), (1.0, 1.0, r'$(1, 1)$'), (4.0, 0.5, r'$(4, 1/2)$')]
    for px, py, label in key_points:
        ax.plot(px, py, 'o', color='#e11d48', markersize=6, zorder=5)
        ax.annotate(label, xy=(px, py), xytext=(px + 0.15, py + 0.15),
                    fontsize=10, fontweight='medium',
                    bbox=dict(boxstyle='round,pad=0.2', facecolor='white', edgecolor='#e2e8f0', alpha=0.9))

    # Tangent line at x = 1 (f(1) = 1, f'(1) = -0.5 => y - 1 = -0.5(x - 1))
    x_tangent = np.linspace(0.1, 3.0, 100)
    y_tangent = 1.0 - 0.5 * (x_tangent - 1.0)
    ax.plot(x_tangent, y_tangent, '--', color='#f43f5e', linewidth=1.5, alpha=0.8,
            label=r'Tangent at $x=1$: $y = -\frac{1}{2}x + \frac{3}{2}$')

    # Asymptotes
    ax.axvline(0, color='#64748b', linestyle=':', linewidth=1.2, label='Vertical Asymptote: $x=0$')
    ax.axhline(0, color='#64748b', linestyle=':', linewidth=1.2, label='Horizontal Asymptote: $y=0$')

    # Formatting
    ax.set_xlim(-0.3, 6.0)
    ax.set_ylim(-0.3, 4.5)
    ax.set_xlabel('$x$', fontsize=12, labelpad=8)
    ax.set_ylabel('$y$', fontsize=12, labelpad=8)
    ax.set_title(r'Graph of $f(x) = \frac{1}{\sqrt{x}} \quad (x > 0)$', fontsize=14, pad=12, fontweight='bold')
    ax.legend(frameon=True, facecolor='white', framealpha=0.9, fontsize=9.5, loc='upper right')
    ax.grid(True, linestyle='--', alpha=0.5)

    plt.tight_layout()
    output_path = r'f:\antigravity\math\plot_fx.png'
    plt.savefig(output_path, dpi=300)
    print(f"Plot saved successfully to {output_path}")

if __name__ == '__main__':
    generate_plot()
