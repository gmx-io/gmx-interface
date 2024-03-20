// {/* #2d42fc */}
export default function UiPage() {
  return (
    <main className="p-20">
      <h1 className="text-xl font-bold">UI Page</h1>
      <p>This page demonstrates the use of the UI components in the app.</p>

      <h2 className="text-lg font-bold mt-10">Colors</h2>
      <div className="flex gap-8">
        <div>
          <div className="size-64 bg-blue rounded-4 self-center" />
          blue
        </div>
        <div>
          <div className="size-64 bg-gray rounded-4 self-center" />
          gray
        </div>
        <div>
          <div className="size-64 bg-yellow rounded-4 self-center" />
          yellow
        </div>
        <div>
          <div className="size-64 bg-red rounded-4 self-center" />
          red
        </div>
        <div>
          <div className="size-64 bg-green rounded-4 self-center" />
          green
        </div>
      </div>

      <h2 className="text-lg font-bold mt-10">Typography</h2>
      <div>
        <div className="flex items-baseline gap-8">
          <div>xl</div>
          <p className="text-xl">Some very important title</p>
        </div>
        <div className="flex items-baseline gap-8">
          <div>lg</div>
          <p className="text-lg">Not that important title</p>
        </div>
        <div className="flex items-baseline gap-8">
          <div>md</div>
          <p className="text-md">Some important text indeed</p>
        </div>
        <div className="flex items-baseline gap-8">
          <div>base</div>
          <p className="text-base">Base text it is. Nothing special</p>
        </div>
        <div className="flex items-baseline gap-8">
          <div>sm</div>
          <p className="text-sm">Somewhat unimportant text, but still readable</p>
        </div>
      </div>
    </main>
  );
}
