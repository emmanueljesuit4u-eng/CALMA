import dotenv from 'dotenv';
dotenv.config();

export interface GenerateRequestPayload {
  prompt: string;
  attachments?: Array<{
    name: string;
    url: string;
    isImage: boolean;
    dataBase64?: string;
    mimeType?: string;
  }>;
}

export interface GenerateResponsePayload {
  success: boolean;
  text: string;
  imageUrl?: string;
  chartSvg?: string;
  modelUsed?: string;
  error?: string;
}

const STABILITY_FALLBACK_KEY = 'sk-ayDfnyv5STqTpkghxVZyVmPXfaKrTSFrStFfFqdaKAkoEluR';

async function generateWithStabilityAI(prompt: string): Promise<{ imageUrl: string; modelUsed: string }> {
  const apiKey = process.env.STABILITY_API_KEY || STABILITY_FALLBACK_KEY;

  if (!apiKey) {
    throw new Error('STABILITY_API_KEY is not configured in backend environment.');
  }

  // 1. Try Stability AI v2beta Stable Image Core
  try {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('output_format', 'png');

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: formData,
      signal: AbortSignal.timeout(30000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.image) {
        return {
          imageUrl: `data:image/png;base64,${data.image}`,
          modelUsed: 'stability-image-core',
        };
      }
    } else {
      const errorData = await res.json().catch(() => ({}));
      console.warn('Stability v2beta error:', errorData);
    }
  } catch (err) {
    console.warn('Stability v2beta fetch failed, falling back to SDXL v1:', err);
  }

  // 2. Fallback to Stability AI v1 SDXL 1024
  const resV1 = await fetch(
    'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt, weight: 1 }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: 1,
      }),
      signal: AbortSignal.timeout(35000),
    }
  );

  if (!resV1.ok) {
    const errorData = await resV1.json().catch(() => ({}));
    throw new Error(
      errorData?.message ||
        `Stability AI generation failed with status ${resV1.status}: ${resV1.statusText}`
    );
  }

  const dataV1 = await resV1.json();
  const base64 = dataV1?.artifacts?.[0]?.base64;

  if (!base64) {
    throw new Error('No image artifact returned from Stability AI.');
  }

  return {
    imageUrl: `data:image/png;base64,${base64}`,
    modelUsed: 'stable-diffusion-xl-1024',
  };
}

export async function processCliGraphGeneration(
  payload: GenerateRequestPayload
): Promise<GenerateResponsePayload> {
  const { prompt } = payload;
  const trimmedPrompt = prompt?.trim();

  if (!trimmedPrompt) {
    return {
      success: false,
      text: '',
      error: 'Please enter a prompt describing the image or design you would like to generate.',
    };
  }

  try {
    // Generate real image via Stability AI backend integration
    const { imageUrl, modelUsed } = await generateWithStabilityAI(trimmedPrompt);

    return {
      success: true,
      text: '',
      imageUrl,
      modelUsed,
    };
  } catch (err: any) {
    console.error('Generation error in /api/generate:', err);
    return {
      success: false,
      text: '',
      error:
        err?.message ||
        'Failed to generate image with Stability AI. Please check the prompt or API configuration.',
    };
  }
}
