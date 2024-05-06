// {/* #2d42fc */}
export default function UiPage() {
  return (
    <main className="p-20 max-w-prose mx-auto">
      <h1 className="text-xl font-bold">UI Page</h1>
      <p>This page demonstrates the use of the UI components in the app.</p>

      <h2 className="text-lg font-bold mt-24 mb-16">Fill colors</h2>
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

      <h2 className="text-lg font-bold mt-24 mb-16">Text colors</h2>

      <div className="flex gap-16">
        <p className="text-blue">Blue text is blue</p>
        <p className="text-gray">Gray text is gray</p>
        <p className="text-yellow">Yellow text is yellow</p>
        <p className="text-red">Red text is red</p>
        <p className="text-green">Green text is green</p>
        <p className="text-white">White text is white</p>
      </div>

      <h2 className="text-lg font-bold mt-24 mb-16">Font sizes</h2>
      <div className="flex flex-col gap-16">
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

        <div className="flex items-baseline gap-8">
          <div>&lt;unset&gt;</div>
          <p>Text with no size set</p>
        </div>
      </div>

      <h2 className="text-lg font-bold mt-24 mb-16">Line heights</h2>
      <div className="flex flex-col gap-16">
        <p className="leading-1">
          leading-1
          <br />
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Temporibus beatae atque eligendi sunt quasi et porro
          nemo cumque nesciunt dolorum earum, minus fuga similique exercitationem ad. Eos omnis vitae suscipit
          recusandae iste adipisci quasi rem odio, quidem qui modi impedit quibusdam culpa nemo distinctio rerum tempora
          sequi facilis quaerat laudantium pariatur dicta ab. Pariatur mollitia magni consectetur praesentium nulla
          nobis non voluptates laborum obcaecati enim unde, in tempore voluptas, expedita aut corrupti ipsum sequi
          consequatur iste corporis quasi! Officia nihil pariatur, asperiores molestiae quia earum tempora, in neque
          inventore quisquam dolore veniam minus beatae adipisci quod hic? Saepe, aperiam consequuntur!
        </p>
        <p className="leading-base">
          leading-base
          <br />
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Temporibus beatae atque eligendi sunt quasi et porro
          nemo cumque nesciunt dolorum earum, minus fuga similique exercitationem ad. Eos omnis vitae suscipit
          recusandae iste adipisci quasi rem odio, quidem qui modi impedit quibusdam culpa nemo distinctio rerum tempora
          sequi facilis quaerat laudantium pariatur dicta ab. Pariatur mollitia magni consectetur praesentium nulla
          nobis non voluptates laborum obcaecati enim unde, in tempore voluptas, expedita aut corrupti ipsum sequi
          consequatur iste corporis quasi! Officia nihil pariatur, asperiores molestiae quia earum tempora, in neque
          inventore quisquam dolore veniam minus beatae adipisci quod hic? Saepe, aperiam consequuntur!
        </p>
      </div>
    </main>
  );
}
