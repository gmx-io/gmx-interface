import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { encodeFunctionData } from "viem";
import { useAccount } from "wagmi";

import { getExplorerUrl } from "config/chains";
import { createAndSignTokenPermit, getTokenPermitParams } from "domain/tokens/permitUtils";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import useWallet from "lib/wallets/useWallet";
import { abis } from "sdk/abis";
import { getV2Tokens } from "sdk/configs/tokens";
import { SignedTokenPermit, Token } from "sdk/types/tokens";
import { MaxUint256 } from "sdk/utils/numbers";

import Button from "components/Button/Button";
import Modal from "components/Modal/Modal";
import TokenIcon from "components/TokenIcon/TokenIcon";

export function TestPermits() {
  const { address } = useAccount();
  const { chainId } = useChainId();
  const { signer } = useWallet();
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permitData, setPermitData] = useState<SignedTokenPermit | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [onchainParams, setOnchainParams] = useState<
    Record<string, { name?: string; version?: string; nonce?: bigint; error: boolean } | undefined>
  >({});
  const [onchainLoading, setOnchainLoading] = useState<Record<string, boolean>>({});

  const tokens = getV2Tokens(chainId).filter((token) => !token.isNative);

  useEffect(() => {
    if (!signer?.provider || !address) return;

    tokens.forEach((token) => {
      if (onchainParams[token.address] || onchainLoading[token.address]) {
        return;
      }
      setOnchainLoading((prev) => ({ ...prev, [token.address]: true }));
      getTokenPermitParams(chainId, address, token.address, signer.provider)
        .then((params) => {
          setOnchainParams((prev) => ({
            ...prev,
            [token.address]: { name: params.name, version: params.version, nonce: params.nonce, error: false },
          }));
        })
        .catch(() => {
          setOnchainParams((prev) => ({
            ...prev,
            [token.address]: { error: true },
          }));
        })
        .finally(() => {
          setOnchainLoading((prev) => ({ ...prev, [token.address]: false }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, signer, address, chainId]);

  const handleSignPermit = async () => {
    if (!selectedToken || !address || !signer) return;

    setIsLoading(true);
    try {
      const value = MaxUint256;

      const permit = await createAndSignTokenPermit(chainId, signer, selectedToken.address, address, value);

      setPermitData(permit);
      helperToast.success(`Permit signed successfully for ${selectedToken.symbol}`);
    } catch (error) {
      helperToast.error(`Error signing permit for ${selectedToken.symbol}: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendPermit = async () => {
    if (!selectedToken || !address || !permitData || !signer) return;
    setIsLoading(true);

    try {
      const data = encodeFunctionData({
        abi: abis.ERC20PermitInterface,
        functionName: "permit",
        args: [
          permitData.owner,
          permitData.spender,
          permitData.value,
          permitData.deadline,
          permitData.v,
          permitData.r,
          permitData.s,
        ],
      });

      const tx = await signer.sendTransaction({
        to: selectedToken.address,
        data,
      });
      const explorerUrl = getExplorerUrl(chainId) + "tx/" + tx.hash;
      toast.success(
        <div>
          Permit transaction sent for {selectedToken.symbol}!{" "}
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="underline">
            View
          </a>
        </div>
      );
    } catch (error) {
      helperToast.error(`Error sending permit for ${selectedToken.symbol}: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenClick = (token: Token) => {
    setSelectedToken(token);
    setPermitData(null);
    setIsModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl mb-6 font-bold">Token Permit Testing</h1>

      <div className="mt-8 space-y-16">
        {tokens
          .sort((a, b) => (onchainParams[a.address]?.error ? 1 : -1) - (onchainParams[b.address]?.error ? 1 : -1))
          .map((token) => {
            const params = onchainParams[token.address];
            const loading = onchainLoading[token.address];
            return (
              <div
                key={token.address}
                className="flex cursor-pointer items-center space-x-6 border-b border-slate-700 p-2 pb-4"
              >
                <TokenIcon symbol={token.symbol} displaySize={32} importSize={40} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-col gap-2 hover:underline" onClick={() => handleTokenClick(token)}>
                    <span className="text-lg truncate font-medium">{token.symbol}</span>
                    <span className="text-xs text-slate-400 truncate">{token.name}</span>
                  </div>
                  <div className="text-slate-400 mt-2 flex flex-col gap-1 text-[11px]">
                    <span className="text-xs text-slate-400 ">{token.address}</span>
                    <div>
                      <span className="font-semibold">permitSupported:</span>{" "}
                      {token.isPermitSupported === true ? (
                        <span className="text-green-500">true</span>
                      ) : (
                        <span className="text-red-500">false</span>
                      )}
                    </div>
                    <div>
                      <span className="font-semibold">permitDisabled:</span>{" "}
                      {token.isPermitDisabled === true ? (
                        <span className="text-red-500">true</span>
                      ) : (
                        <span className="text-green-500">false</span>
                      )}
                    </div>
                    <div>
                      <span className="font-semibold">version:</span> {loading ? "..." : params?.version ?? "-"}
                    </div>
                    <div>
                      <span className="font-semibold">onchain name:</span> {loading ? "..." : params?.name ?? "-"}
                    </div>
                    <div>
                      <span className="font-semibold">nonce:</span> {loading ? "..." : params?.nonce?.toString() ?? "-"}
                    </div>
                    {params?.error && (
                      <div>
                        <span className="font-semibold text-red-500">Onchain data error</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <Modal isVisible={isModalOpen} setIsVisible={setIsModalOpen} label="Token Permit">
        {selectedToken && (
          <div className="flex min-w-[400px] flex-col  space-y-8">
            <div className="mb-6 flex flex-col space-x-4">
              <TokenIcon symbol={selectedToken.symbol} displaySize={40} importSize={40} />
              <div>
                <h2 className="text-2xl font-semibold text-white">{selectedToken.symbol}</h2>
                <div>
                  <div className="text-xs text-slate-400">{selectedToken.address}</div>
                </div>
              </div>
              <div>
                <div>
                  <span className="font-semibold">permitSupported:</span>{" "}
                  {selectedToken.isPermitSupported === true ? (
                    <span className="text-green-500">true</span>
                  ) : (
                    <span className="text-red-500">false</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold">permitDisabled:</span>{" "}
                  {selectedToken.isPermitDisabled === true ? (
                    <span className="text-red-500">true</span>
                  ) : (
                    <span className="text-green-500">false</span>
                  )}
                </div>
                <div>
                  <span className="font-semibold">version:</span> {selectedToken.contractVersion}
                </div>
                <div>
                  <span className="font-semibold">onchain name:</span> {selectedToken.name}
                </div>
                <div>
                  <span className="font-semibold">nonce:</span>{" "}
                  {onchainParams[selectedToken.address]?.nonce?.toString() ?? "-"}
                </div>
                {selectedToken.isPermitDisabled && (
                  <div>
                    <span className="font-semibold text-red-500">Onchain data error</span>
                  </div>
                )}
              </div>
            </div>

            {permitData && (
              <div className="rounded-xl text-slate-200 text-base bg-slate-800 p-6 shadow-inner">
                <h2 className="text-lg mb-4 font-bold tracking-wide text-slate-100">Permit Details</h2>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold">Deadline:</span>{" "}
                    {new Date(Number(permitData.deadline) * 1000).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold">Value:</span> {permitData.value.toString()}
                  </div>
                  <div className="mb-1 mt-16 font-semibold">Signature:</div>
                  <div className="rounded text-xs text-slate-300 space-y-1 overflow-x-auto p-3">
                    <div>
                      <span className="font-bold">r:</span> {permitData.r}
                    </div>
                    <div>
                      <span className="font-bold">s:</span> {permitData.s}
                    </div>
                    <div>
                      <span className="font-bold">v:</span> {permitData.v}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleSignPermit} disabled={!address || isLoading} className="w-full" variant="primary">
              {isLoading ? "Signing..." : "Sign Permit"}
            </Button>

            {permitData && (
              <Button onClick={handleSendPermit} disabled={!address || isLoading} className="w-full" variant="primary">
                {isLoading ? "Sending..." : "Send Permit"}
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
