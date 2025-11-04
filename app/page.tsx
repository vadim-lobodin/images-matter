export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans dark:bg-black">
      <main className="bg-white dark:bg-black">
        <div className="p-6">
          <p className="max-w-md text-lg leading-8 text-neutral-600 dark:text-neutral-400">
            Generate, edit, and create variations of images using AI models via LiteLLM proxy.
            Supports DALL-E, Stable Diffusion, and Vertex AI Imagen.
          </p>
        </div>
      </main>
    </div>
  );
}
