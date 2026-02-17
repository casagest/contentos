import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class", "class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			/* Surface hierarchy — semantic dark backgrounds */
  			surface: {
  				ground: 'hsl(var(--surface-ground))',
  				sunken: 'hsl(var(--surface-sunken))',
  				raised: 'hsl(var(--surface-raised))',
  				overlay: 'hsl(var(--surface-overlay))',
  				tooltip: 'hsl(var(--surface-tooltip))',
  			},
  			/* Landing page warm palette */
  			landing: {
  				warm: 'hsl(var(--landing-warm))',
  				'warm-card': 'hsl(var(--landing-warm-card))',
  				olive: 'hsl(var(--landing-olive))',
  				dark: 'hsl(var(--landing-dark))',
  				darkest: 'hsl(var(--landing-darkest))',
  			},
  			brand: {
  				'50': '#EEF2FF',
  				'100': '#E0E7FF',
  				'200': '#C7D2FE',
  				'300': '#A5B4FC',
  				'400': '#818CF8',
  				'500': '#6366F1',
  				'600': '#4F46E5',
  				'700': '#4338CA',
  				'800': '#3730A3',
  				'900': '#312E81',
  				'950': '#1E1B4B'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontSize: {
  			'display': ['var(--text-display)', { lineHeight: '1.1', fontWeight: '800' }],
  			'heading-1': ['var(--text-heading-1)', { lineHeight: '1.2', fontWeight: '700' }],
  			'heading-2': ['var(--text-heading-2)', { lineHeight: '1.3', fontWeight: '600' }],
  			'heading-3': ['var(--text-heading-3)', { lineHeight: '1.4', fontWeight: '600' }],
  			'body': ['var(--text-body)', { lineHeight: '1.6' }],
  			'caption': ['var(--text-caption)', { lineHeight: '1.5' }],
  			'micro': ['var(--text-micro)', { lineHeight: '1.4' }],
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-dm-sans)',
  				'system-ui',
  				'sans-serif'
  			],
  			display: [
  				'var(--font-cal-sans)',
  				'var(--font-dm-sans)',
  				'system-ui'
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [tailwindAnimate],
};

export default config;
