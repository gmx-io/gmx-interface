import PageTitle from '@/components/Common/PageTitle/PageTitle';
import { t, Trans } from '@lingui/macro';
import React, { useEffect } from 'react';
import icon_gmx_solana from '@/img/logo_gmx_solana_40.svg';
import { useLingui } from '@lingui/react';

type Contributor = {
  id: number;
  name: string;
  description: string;
};

interface ImportedImage {
  default: string;
}

const CommunityBoard: React.FC = () => {
  const { i18n } = useLingui();
  useEffect(() => {}, [i18n.locale]);

  const contributors: Contributor[] = [
    {
      id: 1,
      name: 'Xdev',
      description: t`Built GMX from zero to become one of the most trusted protocols in DeFi. Provided decisive support for GMX Solana development.`,
    },
    {
      id: 2,
      name: 'CoinflipCanada',
      description: t`Established connections between GMX Solana and numerous DeFi protocols, significantly enhancing GMX Solana's influence.`,
    },
    {
      id: 3,
      name: 'Xhiroz',
      description: t`Led the development of GMX Frontend and provided substantial guidance and support for GMX Solana Frontend development.`,
    },
    {
      id: 4,
      name: 'Gdev',
      description: t`Provided many suggestions and decisive support in the development of GMX Solana keeper.`,
    },
    {
      id: 5,
      name: 'KR',
      description: t`Offered numerous recommendations and assistance for the operations of GMX Solana.`,
    },
    {
      id: 6,
      name: 'Raoul Schipper',
      description: t`Made the first public presentation of GMX Solana at SmartCon.`,
    },
    {
      id: 7,
      name: 'SniperMonke',
      description: t`Volunteered as moderator without compensation, and achieved GMX Solana's first 7-day posting streak.`,
    },
    {
      id: 8,
      name: 'Jonezee',
      description: t`Provided many suggestions and support for early external content output of GMX Solana.`,
    },
    {
      id: 9,
      name: 'Saurabh',
      description: t`Completed most of the initial governance proposals for GMX Solana and established connections with many protocols.`,
    },
    {
      id: 10,
      name: 'Kal',
      description: t`Conducted extensive testing work for GMX Solana, contributing to protocol security and stability.`,
    },
    {
      id: 11,
      name: 'Seraph',
      description: t`Established and maintained strong connections between GMX Solana and Chinese community.`,
    },
    {
      id: 12,
      name: 'Tano',
      description: t`Expanded GMX Solana influence on social media and contributed to early protocol testing.`,
    },
    {
      id: 13,
      name: 'XM',
      description: t`Built GMX Blueberry Club, uniting the community through blueberry avatars.`,
    },
    {
      id: 14,
      name: 'Jayski',
      description: t`Managed early GMX Solana community and provided guidance for content development.`,
    },
    {
      id: 15,
      name: 'Q',
      description: t`An anonymous GMX community member.`,
    },
    {
      id: 16,
      name: 'Y',
      description: t`Assisted in identifying an issue in the frontend where collateral swap was not possible when the GM pool was full.`,
    },
    {
      id: 17,
      name: 'lusir',
      description: t`Created the first comprehensive thread in Chinese, expanding its influence in the Chinese community.`,
    },
  ];

  const getContributorImage = React.useCallback(
    async (id: number): Promise<string> => {
      try {
        const imageModule = (await import(
          `@/img/contributor-${id}.jpg`
        )) as ImportedImage;
        return imageModule.default;
      } catch {
        return icon_gmx_solana;
      }
    },
    []
  );

  const [contributorImages, setContributorImages] = React.useState<
    Record<number, string>
  >({});

  React.useEffect(() => {
    const loadImages = async () => {
      const imagePromises = contributors
        .filter((contributor) => contributor.name !== '...')
        .map(async (contributor) => {
          const imagePath = await getContributorImage(contributor.id);
          return { id: contributor.id, path: imagePath };
        });

      const loadedImages = await Promise.all(imagePromises);
      const newImages = loadedImages.reduce(
        (acc, { id, path }) => ({
          ...acc,
          [id]: path,
        }),
        {}
      );

      setContributorImages(newImages);
    };

    void loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getContributorImage]);

  return (
    <div className="default-container page-layout">
      <PageTitle
        title={t`Community`}
        subtitle={
          <div>
            <Trans>
              An objective record of community members who have contributed to
              GMX Solana
            </Trans>
            <br />
            <Trans>
              This does not represent any endorsement of the listed members
            </Trans>
          </div>
        }
      />
      <div className="w-full">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-20 md:grid-cols-2 lg:grid-cols-3">
          {contributors.map((contributor) => (
            <div
              key={contributor.id}
              className={`App-card rounded-lg p-6 transition-colors hover:bg-slate-700 ${
                contributor.name === '...'
                  ? 'flex items-center justify-center'
                  : ''
              }`}
            >
              {contributor.name === '...' ? (
                <span className="text-body-large text-slate-400">...</span>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-8">
                    <img
                      src={contributorImages[contributor.id] || icon_gmx_solana}
                      alt={t`${contributor.name}'s avatar`}
                      className="h-[40px] w-[40px] rounded-full object-cover"
                    />
                    <div>
                      <h3 className="text-body-large text-white">
                        {contributor.name}
                      </h3>
                    </div>
                  </div>
                  <p className="text-body-medium mt-20 leading-relaxed text-slate-200">
                    {contributor.description}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommunityBoard;
