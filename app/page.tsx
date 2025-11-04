export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans dark:bg-black">
      <main className="bg-white dark:bg-black">
        <div className="p-6">
          <p className="max-w-md text-xl leading-9 text-neutral-600 dark:text-neutral-400">
            <span className="text-black dark:text-neutral-50">Vadim Lobodin</span>
            <br />
            Product designer focused on tools for experts.
            <br />
            Now designing tools that change how teams build products at{" "}
            <a
              href="https://www.jetbrains.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
            >
              JetBrains
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
