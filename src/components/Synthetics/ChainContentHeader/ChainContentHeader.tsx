import { AppHeader } from "components/AppHeader/AppHeader";
import { AppHeaderLogo } from "components/AppHeader/AppHeaderLogo";
import { ChainDataImage } from "components/ChainDataImage";

export function ChainContentHeader() {
  return (
    <>
      <AppHeader
        leftContent={
          <div className="flex items-center gap-16 pl-12">
            <AppHeaderLogo />
            <div className="max-md:hidden">
              <ChainDataImage />
            </div>
          </div>
        }
      />
      <div className="px-20 pt-8 md:hidden">
        <ChainDataImage />
      </div>
    </>
  );
}
