import { t, Trans } from "@lingui/macro";
import { useMemo, useState } from "react";
import { concatHex, encodeAbiParameters, isHex, keccak256, type Address, type Hex } from "viem";

import { ARBITRUM_SEPOLIA } from "config/chains";
import { helperToast } from "lib/helperToast";
import { getPublicClientWithRpc } from "lib/wallets/rainbowKitConfig";

import Button from "components/Button/Button";

import {
  AddressInput,
  EIP1271_BYTES_MAGIC_VALUE,
  EIP1271_MAGIC_VALUE,
  getErrorMessage,
  getSafeContractErrorHint,
  MINIFIED_TYPEHASH,
  SAFE_1271_BYTES32_ABI,
  SAFE_1271_BYTES_ABI,
} from "./devSmartWalletShared";

export function DevSmartWalletSignatureTab({
  validatorSafeAddressInput,
  setValidatorSafeAddressInput,
  validatorSafeAddress,
  providerSafeAddressInput,
  pushActivity,
}: {
  validatorSafeAddressInput: string;
  setValidatorSafeAddressInput: (value: string) => void;
  validatorSafeAddress: Address | undefined;
  providerSafeAddressInput: string;
  pushActivity: (message: string) => void;
}) {
  const [validatorHashInput, setValidatorHashInput] = useState("");
  const [validatorDomainSeparatorInput, setValidatorDomainSeparatorInput] = useState("");
  const [validatorSignatureInput, setValidatorSignatureInput] = useState("");
  const [isValidatorChecking, setIsValidatorChecking] = useState(false);
  const [validatorResult, setValidatorResult] = useState<
    | {
        safeAddress: Address;
        hash: Hex;
        bytes32ReturnValue?: Hex;
        bytesReturnValue?: Hex;
        bytes32Error?: string;
        bytesError?: string;
        signatureUtilsDomainSeparator?: Hex;
        signatureUtilsMinifiedDigest?: Hex;
        signatureUtilsDigest1271ReturnValue?: Hex;
        signatureUtilsDigest1271Error?: string;
        signatureUtilsMinified1271ReturnValue?: Hex;
        signatureUtilsMinified1271Error?: string;
        signatureUtils1271Valid?: boolean;
        isValid: boolean;
      }
    | undefined
  >();
  const [validatorError, setValidatorError] = useState<string | undefined>();

  const validatorFormError = useMemo(() => {
    if (!validatorSafeAddressInput.trim()) return "Safe address is required";
    if (!validatorSafeAddress) return "Validator Safe address is invalid";
    if (!validatorHashInput.trim()) return "Hash is required";
    if (!isHex(validatorHashInput) || validatorHashInput.length !== 66)
      return "Hash must be a 32-byte hex value (0x + 64 hex chars)";
    if (!validatorSignatureInput.trim()) return "Signature is required";
    if (!isHex(validatorSignatureInput)) return "Signature must be hex";
    if (validatorDomainSeparatorInput.trim()) {
      if (!isHex(validatorDomainSeparatorInput) || validatorDomainSeparatorInput.length !== 66)
        return "Domain separator must be a 32-byte hex value (0x + 64 hex chars)";
    }
    return undefined;
  }, [
    validatorDomainSeparatorInput,
    validatorHashInput,
    validatorSafeAddress,
    validatorSafeAddressInput,
    validatorSignatureInput,
  ]);

  function computeMinifiedDigest(domainSeparator: Hex, digest: Hex): Hex {
    const minifiedStructHash = keccak256(
      encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }], [MINIFIED_TYPEHASH as Hex, digest])
    );
    return keccak256(concatHex(["0x1901", domainSeparator, minifiedStructHash]));
  }

  async function handleValidate() {
    setValidatorError(undefined);
    setValidatorResult(undefined);

    if (validatorFormError || !validatorSafeAddress) {
      const message = validatorFormError ?? "Invalid validator inputs";
      setValidatorError(message);
      helperToast.error(message);
      return;
    }

    setIsValidatorChecking(true);

    try {
      const publicClient = getPublicClientWithRpc(ARBITRUM_SEPOLIA);
      let bytes32ReturnValue: Hex | undefined;
      let bytesReturnValue: Hex | undefined;
      let bytes32Error: string | undefined;
      let bytesError: string | undefined;

      try {
        bytes32ReturnValue = (await publicClient.readContract({
          address: validatorSafeAddress,
          abi: SAFE_1271_BYTES32_ABI,
          functionName: "isValidSignature",
          args: [validatorHashInput as Hex, validatorSignatureInput as Hex],
        })) as Hex;
      } catch (error) {
        bytes32Error = getErrorMessage(error);
      }

      try {
        bytesReturnValue = (await publicClient.readContract({
          address: validatorSafeAddress,
          abi: SAFE_1271_BYTES_ABI,
          functionName: "isValidSignature",
          args: [validatorHashInput as Hex, validatorSignatureInput as Hex],
        })) as Hex;
      } catch (error) {
        bytesError = getErrorMessage(error);
      }

      const bytes32Valid = bytes32ReturnValue?.slice(0, 10).toLowerCase() === EIP1271_MAGIC_VALUE;
      const bytesValid = bytesReturnValue?.slice(0, 10).toLowerCase() === EIP1271_BYTES_MAGIC_VALUE;
      let signatureUtilsDomainSeparator: Hex | undefined;
      let signatureUtilsMinifiedDigest: Hex | undefined;
      let signatureUtilsDigest1271ReturnValue: Hex | undefined;
      let signatureUtilsDigest1271Error: string | undefined;
      let signatureUtilsMinified1271ReturnValue: Hex | undefined;
      let signatureUtilsMinified1271Error: string | undefined;

      if (validatorDomainSeparatorInput.trim()) {
        signatureUtilsDomainSeparator = validatorDomainSeparatorInput as Hex;
        signatureUtilsMinifiedDigest = computeMinifiedDigest(signatureUtilsDomainSeparator, validatorHashInput as Hex);

        try {
          signatureUtilsDigest1271ReturnValue = (await publicClient.readContract({
            address: validatorSafeAddress,
            abi: SAFE_1271_BYTES32_ABI,
            functionName: "isValidSignature",
            args: [validatorHashInput as Hex, validatorSignatureInput as Hex],
          })) as Hex;
        } catch (error) {
          signatureUtilsDigest1271Error = getErrorMessage(error);
        }

        try {
          signatureUtilsMinified1271ReturnValue = (await publicClient.readContract({
            address: validatorSafeAddress,
            abi: SAFE_1271_BYTES32_ABI,
            functionName: "isValidSignature",
            args: [signatureUtilsMinifiedDigest, validatorSignatureInput as Hex],
          })) as Hex;
        } catch (error) {
          signatureUtilsMinified1271Error = getErrorMessage(error);
        }
      }

      const signatureUtilsDigestValid =
        signatureUtilsDigest1271ReturnValue?.slice(0, 10).toLowerCase() === EIP1271_MAGIC_VALUE;
      const signatureUtilsMinifiedValid =
        signatureUtilsMinified1271ReturnValue?.slice(0, 10).toLowerCase() === EIP1271_MAGIC_VALUE;
      const signatureUtils1271Valid =
        validatorDomainSeparatorInput.trim().length > 0
          ? Boolean(signatureUtilsDigestValid || signatureUtilsMinifiedValid)
          : undefined;

      const isValid = Boolean(bytes32Valid || bytesValid || signatureUtils1271Valid);

      setValidatorResult({
        safeAddress: validatorSafeAddress,
        hash: validatorHashInput as Hex,
        bytes32ReturnValue,
        bytesReturnValue,
        bytes32Error,
        bytesError,
        signatureUtilsDomainSeparator,
        signatureUtilsMinifiedDigest,
        signatureUtilsDigest1271ReturnValue,
        signatureUtilsDigest1271Error,
        signatureUtilsMinified1271ReturnValue,
        signatureUtilsMinified1271Error,
        signatureUtils1271Valid,
        isValid,
      });

      pushActivity(
        `1271 check (${validatorSafeAddress}): ${
          isValid
            ? `valid${bytes32Valid ? " [bytes32]" : ""}${bytesValid ? " [bytes]" : ""}`
            : `invalid (${bytes32ReturnValue ?? bytesReturnValue ?? "reverted"})`
        }`
      );
      helperToast[isValid ? "success" : "info"](
        isValid ? t`1271 signature is valid` : t`1271 signature is invalid (magic mismatch)`
      );

      if (!bytes32ReturnValue && !bytesReturnValue) {
        const firstError = bytes32Error ?? bytesError;
        if (firstError) {
          const safeHint = getSafeContractErrorHint(firstError);
          const detailedMessage = safeHint ? `${firstError}\n\nSafe code: ${safeHint}` : firstError;
          setValidatorError(detailedMessage);
        }
      }
    } catch (error) {
      const message = getErrorMessage(error);
      const safeHint = getSafeContractErrorHint(message);
      const detailedMessage = safeHint ? `${message}\n\nSafe code: ${safeHint}` : message;
      setValidatorError(detailedMessage);
      pushActivity(`1271 check error: ${safeHint ?? message}`);
      helperToast.error(safeHint ? t`1271 validation failed (${safeHint})` : t`1271 validation failed: ${message}`);
    } finally {
      setIsValidatorChecking(false);
    }
  }

  return (
    <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
      <h2 className="text-18 font-medium">
        <Trans>ERC-1271 Signature Validator</Trans>
      </h2>
      <p className="mt-8 text-13 text-typography-secondary">
        <Trans>
          Tests <code>isValidSignature(bytes32,bytes)</code> on the Safe contract on Arbitrum Sepolia and shows the
          returned magic value.
        </Trans>
      </p>

      <div className="mt-16 grid gap-16">
        <AddressInput
          id="validatorSafeAddress"
          label={t`Safe address (validator target)`}
          value={validatorSafeAddressInput}
          onChange={setValidatorSafeAddressInput}
        />

        <div>
          <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="validatorHash">
            <Trans>Hash (bytes32)</Trans>
          </label>
          <input
            id="validatorHash"
            value={validatorHashInput}
            onChange={(e) => setValidatorHashInput(e.target.value.trim())}
            placeholder="0x..."
            className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="validatorDomainSeparator">
            <Trans>Domain separator (optional, for SignatureUtils-style minified check)</Trans>
          </label>
          <input
            id="validatorDomainSeparator"
            value={validatorDomainSeparatorInput}
            onChange={(e) => setValidatorDomainSeparatorInput(e.target.value.trim())}
            placeholder="0x..."
            className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
          />
        </div>

        <div>
          <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="validatorSignature">
            <Trans>Signature (hex)</Trans>
          </label>
          <textarea
            id="validatorSignature"
            rows={4}
            value={validatorSignatureInput}
            onChange={(e) => setValidatorSignatureInput(e.target.value.trim())}
            placeholder="0x..."
            className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
          />
        </div>

        {validatorFormError && (
          <div className="text-yellow-200 rounded-8 border border-yellow-500/40 bg-yellow-500/10 p-12 text-13">
            {validatorFormError}
          </div>
        )}

        {validatorError && (
          <div className="text-red-200 rounded-8 border border-red-500/40 bg-red-500/10 p-12 text-13">
            {validatorError}
          </div>
        )}

        <div className="flex flex-wrap gap-8">
          <Button
            variant="primary-action"
            onClick={handleValidate}
            disabled={Boolean(validatorFormError) || isValidatorChecking}
          >
            {isValidatorChecking ? t`Checking...` : t`Check ERC-1271 Validity`}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (providerSafeAddressInput.trim()) {
                setValidatorSafeAddressInput(providerSafeAddressInput.trim());
              }
            }}
            disabled={!providerSafeAddressInput.trim()}
          >
            <Trans>Use provider Safe address</Trans>
          </Button>
        </div>

        {validatorResult && (
          <div
            className={`rounded-8 border p-12 text-13 ${
              validatorResult.isValid
                ? "text-green-200 border-green-500/40 bg-green-500/10"
                : "text-yellow-200 border-yellow-500/40 bg-yellow-500/10"
            }`}
          >
            <div>
              <Trans>Result</Trans>: {validatorResult.isValid ? t`Valid` : t`Invalid`}
            </div>
            <div className="mt-6 break-all">
              <Trans>bytes32 overload</Trans>:{" "}
              {validatorResult.bytes32ReturnValue ?? validatorResult.bytes32Error ?? t`No result`}
            </div>
            <div className="mt-6 break-all">
              <Trans>bytes overload</Trans>:{" "}
              {validatorResult.bytesReturnValue ?? validatorResult.bytesError ?? t`No result`}
            </div>
            <div className="mt-6 break-all text-typography-secondary">
              <Trans>Expected bytes32 magic</Trans>: {EIP1271_MAGIC_VALUE}
            </div>
            <div className="mt-6 break-all text-typography-secondary">
              <Trans>Expected bytes magic</Trans>: {EIP1271_BYTES_MAGIC_VALUE}
            </div>
            {validatorResult.signatureUtilsDomainSeparator && (
              <>
                <div className="mt-8 break-all text-typography-secondary">
                  <Trans>SignatureUtils minifiedDigest</Trans>: {validatorResult.signatureUtilsMinifiedDigest}
                </div>
                <div className="mt-6 break-all">
                  <Trans>SignatureUtils 1271 on digest</Trans>:{" "}
                  {validatorResult.signatureUtilsDigest1271ReturnValue ??
                    validatorResult.signatureUtilsDigest1271Error ??
                    t`No result`}
                </div>
                <div className="mt-6 break-all">
                  <Trans>SignatureUtils 1271 on minifiedDigest</Trans>:{" "}
                  {validatorResult.signatureUtilsMinified1271ReturnValue ??
                    validatorResult.signatureUtilsMinified1271Error ??
                    t`No result`}
                </div>
                <div className="mt-6 break-all text-typography-secondary">
                  <Trans>SignatureUtils-style 1271 path</Trans>:{" "}
                  {validatorResult.signatureUtils1271Valid === undefined
                    ? t`N/A`
                    : validatorResult.signatureUtils1271Valid
                      ? t`Pass`
                      : t`Fail`}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
