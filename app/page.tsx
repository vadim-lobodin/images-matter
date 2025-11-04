export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="max-w-md text-lg leading-8 text-neutral-600 dark:text-neutral-400">
            Generate, edit, and create variations of images using AI models via LiteLLM proxy.
            Supports DALL-E, Stable Diffusion, and Vertex AI Imagen.
          </p>
        </div>
      </main>
    </div>
  );
}
