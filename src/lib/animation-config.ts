export type AnimationModelKey = 'kling' | 'seedance' | 'minimax';

export interface AnimationModel {
  key: AnimationModelKey;
  falId: string;
  duration: string;
  extraParams: Record<string, unknown>;
}

const MODELS: Record<AnimationModelKey, AnimationModel> = {
  kling: {
    key: 'kling',
    falId: 'fal-ai/kling-video/v2.1/standard/image-to-video',
    duration: '5',
    extraParams: {},
  },
  seedance: {
    key: 'seedance',
    falId: 'fal-ai/seedance-1-lite/image-to-video',
    duration: '5',
    extraParams: {},
  },
  minimax: {
    key: 'minimax',
    falId: 'fal-ai/minimax/hailuo-02/standard/image-to-video',
    duration: '10',
    extraParams: { prompt_optimizer: true, resolution: '768P' },
  },
};

export function getAnimationModel(): AnimationModel {
  const key = (process.env.ANIMATION_MODEL || 'kling') as AnimationModelKey;
  return MODELS[key] || MODELS.kling;
}

const DEFAULT_FALLBACK: Record<AnimationModelKey, AnimationModelKey> = {
  kling: 'seedance',
  seedance: 'kling',
  minimax: 'kling',
};

export function getFallbackModel(primary: AnimationModel): AnimationModel {
  const override = process.env.ANIMATION_FALLBACK_MODEL as AnimationModelKey | undefined;
  if (override && MODELS[override] && override !== primary.key) return MODELS[override];
  return MODELS[DEFAULT_FALLBACK[primary.key]];
}

export function buildAnimationInput(model: AnimationModel, imageUrl: string, prompt: string): Record<string, unknown> {
  return {
    image_url: imageUrl,
    prompt,
    duration: model.duration,
    ...model.extraParams,
  };
}

export { MODELS as ANIMATION_MODELS };
