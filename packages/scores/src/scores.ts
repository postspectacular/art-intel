export interface DerivedScoreSpec {
	parts: Record<string, string>;
	final?: string;
}

export const BASE_SCORES = [
	"hue",
	"brightness",
	"saturation",
	"contrast",
	"complexity",
	"fill",
	"fluid",
	"glitch",
	"gradient",
	"linear",
	"movement",
	"particles",
	"pixel",
	"volume",
];

export const BASE_SCORE_DESCRIPTIONS: Record<string, string> = {
	hue: "Primary hue",
	brightness: "Average brightness (weighted by area)",
	saturation: "Average saturation (weighted by area)",
	contrast: "Brightness contrast of dominant colors",
	complexity: "Overall visual complexity",
	fill: "Overall fill ratio, i.e. how much of the screen area is being actively used",
	fluid: "Rigid vs fluid aesthetics/character",
	glitch: "General amount of glitchy aesthetics",
	gradient: "Overall use of color gradients",
	linear: "Usage of lines or generally linear arrangements",
	movement: "Overall amount & speed of movement",
	particles: "Overall usage of particles",
	pixel: "Emphasis on pixels",
	duration: "Recommended default duration (in minutes)",
};

export const DERIVED_SCORES: Record<string, DerivedScoreSpec> = {
	colorful: {
		parts: {
			saturation: "(* 0.7 x)",
			brightness: "(* 0.2 x (smoothstep 3 8 saturation))",
			contrast: "(* 0.1 x (smoothstep 3 8 saturation))",
			fill: "(* 0.1 x (smoothstep 3 8 saturation))",
		},
	},
	warm: {
		parts: {
			hue: "(* (lut x 10 9 7 5 3 2 1 0 4 8) (smoothstep 1 6 saturation))",
		},
	},
	hard: {
		parts: {
			contrast: "(* 0.4 x)",
			gradient: "(* 0.2 (invert x))",
			brightness: "(* 0.3 x)",
			saturation: "(* 0.1 (invert x))",
		},
	},
	calm: {
		parts: {
			movement: "(* 0.7 (invert x))",
			gradient: "(* 0.2 x)",
			brightness: "(* 0.1 (lanczos 2 7 x))",
		},
	},
	party: {
		parts: {
			colorful: "(* 0.4 x)",
			hard: "(* 0.2 x)",
			calm: "(* 0.4 (invert x))",
		},
	},
};

export const SCORES = [...BASE_SCORES, ...Object.keys(DERIVED_SCORES)];
