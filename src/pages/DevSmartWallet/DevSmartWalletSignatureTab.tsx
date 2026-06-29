import { useMemo, useState } from "react";
import { concatHex, decodeAbiParameters, encodeAbiParameters, isHex, keccak256, type Address, type Hex } from "viem";

import { ARBITRUM_SEPOLIA, getChainName } from "config/chains";
import { helperToast } from "lib/helperToast";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";

import Button from "components/Button/Button";

import {
  AddressInput,
  DEPLOY_SUPPORTED_CHAINS,
  type DeploySupportedChainId,
  EIP1271_BYTES_MAGIC_VALUE,
  EIP1271_MAGIC_VALUE,
  getErrorMessage,
  getSafeContractErrorHint,
  MINIFIED_TYPEHASH,
  SAFE_1271_BYTES32_ABI,
  SAFE_1271_BYTES_ABI,
} from "./devSmartWalletShared";

const EIP_6492_MAGIC_SUFFIX = "0x6492649264926492649264926492649264926492649264926492649264926492" as Hex;

type Eip6492Decoded = {
  factory: Address;
  factoryCalldata: Hex;
  innerSignature: Hex;
};

function tryDecodeEip6492(signature: Hex): Eip6492Decoded | undefined {
  if (signature.length < 2 + 64) return undefined;
  const trailing = `0x${signature.slice(-64)}`.toLowerCase();
  if (trailing !== EIP_6492_MAGIC_SUFFIX.toLowerCase()) return undefined;
  const prefix = `0x${signature.slice(2, signature.length - 64)}` as Hex;
  try {
    const [factory, factoryCalldata, innerSignature] = decodeAbiParameters(
      [
        { name: "factory", type: "address" },
        { name: "factoryCalldata", type: "bytes" },
        { name: "originalSignature", type: "bytes" },
      ],
      prefix
    );
    return {
      factory: factory as Address,
      factoryCalldata: factoryCalldata as Hex,
      innerSignature: innerSignature as Hex,
    };
  } catch {
    return undefined;
  }
}

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
  pushActivity: (message: string, level?: "log" | "warn" | "err") => void;
}) {
  const [validatorChainId, setValidatorChainId] = useState<DeploySupportedChainId>(ARBITRUM_SEPOLIA);
  const [validatorHashInput, setValidatorHashInput] = useState("");
  const [validatorDomainSeparatorInput, setValidatorDomainSeparatorInput] = useState("");
  const [validatorSignatureInput, setValidatorSignatureInput] = useState("");
  const [isValidatorChecking, setIsValidatorChecking] = useState(false);
  const [validatorResult, setValidatorResult] = useState<
    | {
        safeAddress: Address;
        chainId: DeploySupportedChainId;
        hash: Hex;
        eip6492?: Eip6492Decoded;
        bytes32ReturnValue?: Hex;
        bytesReturnValue?: Hex;
        bytes32Error?: string;
        bytesError?: string;
        innerBytes32ReturnValue?: Hex;
        innerBytes32Error?: string;
        innerBytesReturnValue?: Hex;
        innerBytesError?: string;
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

  const detectedEip6492 = useMemo(() => {
    if (!validatorSignatureInput.trim() || !isHex(validatorSignatureInput)) return undefined;
    return tryDecodeEip6492(validatorSignatureInput as Hex);
  }, [validatorSignatureInput]);

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
      const publicClient = getPublicClientWithRpc(validatorChainId);
      const eip6492 = tryDecodeEip6492(validatorSignatureInput as Hex);
      let bytes32ReturnValue: Hex | undefined;
      let bytesReturnValue: Hex | undefined;
      let bytes32Error: string | undefined;
      let bytesError: string | undefined;
      let innerBytes32ReturnValue: Hex | undefined;
      let innerBytes32Error: string | undefined;
      let innerBytesReturnValue: Hex | undefined;
      let innerBytesError: string | undefined;

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

      // If signature is EIP-6492 wrapped, also try the inner Safe signature directly.
      // The Safe contract's 1271 doesn't unwrap 6492 — that's the verifier's job. But against an
      // already-deployed Safe, the inner sig should validate, which proves the inner part is well-formed.
      if (eip6492) {
        try {
          innerBytes32ReturnValue = (await publicClient.readContract({
            address: validatorSafeAddress,
            abi: SAFE_1271_BYTES32_ABI,
            functionName: "isValidSignature",
            args: [validatorHashInput as Hex, eip6492.innerSignature],
          })) as Hex;
        } catch (error) {
          innerBytes32Error = getErrorMessage(error);
        }
        try {
          innerBytesReturnValue = (await publicClient.readContract({
            address: validatorSafeAddress,
            abi: SAFE_1271_BYTES_ABI,
            functionName: "isValidSignature",
            args: [validatorHashInput as Hex, eip6492.innerSignature],
          })) as Hex;
        } catch (error) {
          innerBytesError = getErrorMessage(error);
        }
      }

      const bytes32Valid = bytes32ReturnValue?.slice(0, 10).toLowerCase() === EIP1271_MAGIC_VALUE;
      const bytesValid = bytesReturnValue?.slice(0, 10).toLowerCase() === EIP1271_BYTES_MAGIC_VALUE;
      const innerBytes32Valid = innerBytes32ReturnValue?.slice(0, 10).toLowerCase() === EIP1271_MAGIC_VALUE;
      const innerBytesValid = innerBytesReturnValue?.slice(0, 10).toLowerCase() === EIP1271_BYTES_MAGIC_VALUE;
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

      const isValid = Boolean(
        bytes32Valid || bytesValid || innerBytes32Valid || innerBytesValid || signatureUtils1271Valid
      );

      setValidatorResult({
        safeAddress: validatorSafeAddress,
        chainId: validatorChainId,
        hash: validatorHashInput as Hex,
        eip6492,
        bytes32ReturnValue,
        bytesReturnValue,
        bytes32Error,
        bytesError,
        innerBytes32ReturnValue,
        innerBytes32Error,
        innerBytesReturnValue,
        innerBytesError,
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
        `1271 check (${getChainName(validatorChainId)} ${validatorSafeAddress})${eip6492 ? " [EIP-6492]" : ""}: ${
          isValid
            ? `valid${bytes32Valid ? " [bytes32]" : ""}${bytesValid ? " [bytes]" : ""}${innerBytes32Valid ? " [inner bytes32]" : ""}${innerBytesValid ? " [inner bytes]" : ""}`
            : `invalid (${bytes32ReturnValue ?? bytesReturnValue ?? "reverted"})`
        }`
      );
      helperToast[isValid ? "success" : "info"](
        isValid ? "1271 signature is valid" : "1271 signature is invalid (magic mismatch)"
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
      helperToast.error(safeHint ? `1271 validation failed (${safeHint})` : `1271 validation failed: ${message}`);
    } finally {
      setIsValidatorChecking(false);
    }
  }

  return (
    <div className="rounded-8 border-1/2 border-slate-600 bg-slate-950/50 p-16">
      <h2 className="text-18 font-medium">ERC-1271 Signature Validator</h2>
      <p className="mt-8 text-13 text-typography-secondary">
        Tests <code>isValidSignature(bytes32,bytes)</code> on the Safe contract on the selected chain and shows the
        returned magic value. Detects EIP-6492 wrapping and also validates the unwrapped inner signature.
      </p>

      <div className="mt-16 grid gap-16">
        <div>
          <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="validatorChain">
            Validation chain
          </label>
          <select
            id="validatorChain"
            value={validatorChainId}
            onChange={(e) => setValidatorChainId(Number(e.target.value) as DeploySupportedChainId)}
            className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
          >
            {DEPLOY_SUPPORTED_CHAINS.map((chainId) => (
              <option key={chainId} value={chainId}>
                {getChainName(chainId)} ({chainId})
              </option>
            ))}
          </select>
        </div>

        <AddressInput
          id="validatorSafeAddress"
          label="Safe address (validator target)"
          value={validatorSafeAddressInput}
          onChange={setValidatorSafeAddressInput}
        />

        <div>
          <label className="mb-6 block text-13 font-medium text-typography-primary" htmlFor="validatorHash">
            Hash (bytes32)
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
            Domain separator (optional, for SignatureUtils-style minified check)
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
            Signature (hex)
          </label>
          <textarea
            id="validatorSignature"
            rows={4}
            value={validatorSignatureInput}
            onChange={(e) => setValidatorSignatureInput(e.target.value.trim())}
            placeholder="0x..."
            className="w-full rounded-8 border border-slate-800 bg-slate-800 px-12 py-10 text-14 outline-none focus:border-blue-400"
          />
          {detectedEip6492 && (
            <div className="text-blue-200 mt-6 rounded-8 border border-blue-500/40 bg-blue-500/10 p-12 text-12">
              <div className="font-medium">EIP-6492 wrapped signature detected</div>
              <div className="mt-4 break-all">Factory: {detectedEip6492.factory}</div>
              <div className="mt-2 break-all">Inner signature: {detectedEip6492.innerSignature}</div>
              <div className="mt-4 text-typography-secondary">
                The Safe's 1271 will not unwrap 6492 itself — that's the verifier's job. We'll also validate the inner
                signature directly.
              </div>
            </div>
          )}
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
            {isValidatorChecking ? "Checking…" : "Check ERC-1271 Validity"}
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
            Use provider Safe address
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
              Result: {validatorResult.isValid ? "Valid" : "Invalid"}{" "}
              <span className="text-typography-secondary">
                ({getChainName(validatorResult.chainId)}
                {validatorResult.eip6492 ? ", EIP-6492" : ""})
              </span>
            </div>
            <div className="mt-6 break-all">
              bytes32 overload (raw signature):{" "}
              {validatorResult.bytes32ReturnValue ?? validatorResult.bytes32Error ?? "No result"}
            </div>
            <div className="mt-6 break-all">
              bytes overload (raw signature):{" "}
              {validatorResult.bytesReturnValue ?? validatorResult.bytesError ?? "No result"}
            </div>
            {validatorResult.eip6492 && (
              <>
                <div className="mt-6 break-all">
                  bytes32 overload (inner unwrapped):{" "}
                  {validatorResult.innerBytes32ReturnValue ?? validatorResult.innerBytes32Error ?? "No result"}
                </div>
                <div className="mt-6 break-all">
                  bytes overload (inner unwrapped):{" "}
                  {validatorResult.innerBytesReturnValue ?? validatorResult.innerBytesError ?? "No result"}
                </div>
              </>
            )}
            <div className="mt-6 break-all text-typography-secondary">
              Expected bytes32 magic: {EIP1271_MAGIC_VALUE}
            </div>
            <div className="mt-6 break-all text-typography-secondary">
              Expected bytes magic: {EIP1271_BYTES_MAGIC_VALUE}
            </div>
            {validatorResult.signatureUtilsDomainSeparator && (
              <>
                <div className="mt-8 break-all text-typography-secondary">
                  SignatureUtils minifiedDigest: {validatorResult.signatureUtilsMinifiedDigest}
                </div>
                <div className="mt-6 break-all">
                  SignatureUtils 1271 on digest:{" "}
                  {validatorResult.signatureUtilsDigest1271ReturnValue ??
                    validatorResult.signatureUtilsDigest1271Error ??
                    "No result"}
                </div>
                <div className="mt-6 break-all">
                  SignatureUtils 1271 on minifiedDigest:{" "}
                  {validatorResult.signatureUtilsMinified1271ReturnValue ??
                    validatorResult.signatureUtilsMinified1271Error ??
                    "No result"}
                </div>
                <div className="mt-6 break-all text-typography-secondary">
                  SignatureUtils-style 1271 path:{" "}
                  {validatorResult.signatureUtils1271Valid === undefined
                    ? "N/A"
                    : validatorResult.signatureUtils1271Valid
                      ? "Pass"
                      : "Fail"}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
