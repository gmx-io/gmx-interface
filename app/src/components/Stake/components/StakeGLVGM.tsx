import './StakeGLVGM.scss';
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { t, Trans } from '@lingui/macro';
import Button from "@/components/Common/Button/Button";
import Modal from '@/components/Common/Modal/Modal';
import Tooltip from '@/components/Common/Tooltip/Tooltip';
import { getIconUrlPath } from '@/utils/lib/icon';
import { NumberInput } from '@/components/Common/Input/NumberInput';
import { useStakeProgram, useAnchor, useStoreProgram } from '@/contexts/anchor';
import { useStakeManySingleSocket } from '../Hooks/useStakeManySingleSocket';
import { formatAmount, formatParseUsdToBN, formatUsd, formatCeilToDecimals } from '@/utils/legacy/format';
import { useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction, VersionedMessage, Transaction, PublicKey, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';
import { StakeGlobalState } from '../Hooks/useStakeGlobalState';
import { errorLogRequest } from '../utils/fetchErrorLog';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { useStoreAccount } from '@/hooks/fetchHooks/useStoreAccount';
import { BN } from '@coral-xyz/anchor';
// import { MARKET_LIST_PER_PAGE } from '@/config/ui';
import { StakeQueryController } from '@/components/Stake/Hooks/useStakeQueryController';
import { invokeCreateUnstakeDeposit } from '../utils/submitUnStake';
import { invokeClaimGtDeposit } from '../utils/submitClaimGt';
import { StakePosition } from '../Hooks/useStakePositions';
import SliderComponent from '@/components/ExchangeNew/ExchangeList/PositionList/components/compose-components/slider'
import { STORE_PROGRAM_ID, findUserPDA } from 'gmsol';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getTokenEscrow } from '../utils/getTokenEscrow';
import { prepareAssociatedTokenAccounts } from '../utils/prepareAssociatedTokenAccounts';
import { helperNotice, removeNotice } from '@/utils/lib/helperNotice';
import ExternalLink from '@/components/Common/Link/ExternalLink';
import { getTransactionUrl } from '@/utils/lib/explorer';
// import { Buffer } from 'buffer';

import IconSelect from '@/img/stake/select.svg';
import IconSelectEd from '@/img/stake/selected.svg';
import IconTooltips from '@/img/tooltips.svg';
import IconSelectedAll from '@/img/stake/selectedall.svg';

const ORACLE_PUBKEY = import.meta.env.VITE_GMX_ORACLE_PUBKEY as string;

export default function StakeGLVGM({
  isVisible,
  stakeType,
  modalTitle,
  isShowCheckBox,
  isInputDisabled,
  walletMarketToken,
  setIsVisible,
  selectedPositions,
  selectedClaimGtPositions,
  selectedUnstakPositions,
  stakeGloablState,
  stakeQueryController,
  onStakeRefresh
}: {
  isVisible?: boolean;
  stakeType?: string;
  modalTitle: string;
  isShowCheckBox?: boolean;
  isInputDisabled?: boolean;
  walletMarketToken?: any;
  setIsVisible: (isVisible: boolean) => void;
  selectedPositions?: any[];
  selectedClaimGtPositions?: Array<StakePosition>;
  selectedUnstakPositions?: Array<StakePosition>;
  stakeGloablState: StakeGlobalState;
  stakeQueryController: StakeQueryController,
  onStakeRefresh: () => void;
}) {

  const navigate = useNavigate();
  const [isTransaction, setIsTransaction] = useState(false);
  const { signAllTransactions } = useWallet();
  const { owner } = useAnchor();
  const stakeProgram = useStakeProgram();
  const { tasks, stakeMany, stakeComplete, runningStatus } = useStakeManySingleSocket();

  const [tokens, setTokens] = useState([]);
  const [tokensRwa, setTokensRwa] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const { store: userStore } = useStoreAccount(GMX_SOLANA_STORE_ADDRESS);
  const { decimals = 9 } = userStore?.gt || {};
  const store = useStoreProgram();

  const [gtAmountTotal, setgtAmountTotal] = useState('0');
  const [rate, setRate] = useState(0);
  const noticeIdRef = useRef({});
  const firstLoading = useRef(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const markets = [];
    if (stakeType === 'Stake' && walletMarketToken?.length && focusIndex === -1) {
      walletMarketToken.forEach((item) => {
        const existingToken = tokens.find(t => t.marketToken.toString() === item.marketToken.toString());
        // const amount = formatAmount(item.balance, item.decimals, 2);
        const value = formatAmount(item.balance, item.decimals, item.decimals);

        let isMinUsd = new BN('0');
        if (stakeGloablState && stakeGloablState?.minStakeValue && item?.unitPrice.gt(new BN('0'))) {

          let goUpValue = formatParseUsdToBN('0.08', item.decimals);
          isMinUsd = stakeGloablState.minStakeValue.div(item.unitPrice).add(goUpValue);
        }
        markets.push({
          ...item,
          checked: existingToken?.checked || false,
          value: existingToken?.value || value,
          max: value,
          isMinUsd
        });
      });

      markets.sort((a, b) => Number(b.max) - Number(a.max));
      // console.log('markets', markets);

      const marketData = markets.filter((item) => item.isRwaOpen !== false);
      const rwaData = markets.filter((item) => item.isRwaOpen === false);
      setTokens(marketData);
      setTokensRwa(rwaData);
    }
    if (stakeType === 'Unstake' && selectedUnstakPositions?.length && focusIndex === -1) {
      // const markets = [];
      selectedUnstakPositions.forEach((item) => {
        const existingToken = tokens.find(t => t.marketToken.toString() === item.marketToken.toString());
        // const amount = formatAmount(item.stakedAmount, item.decimals, 4);
        const value = formatAmount(item.balance, item.decimals, item.decimals);

        markets.push({
          ...item,
          checked: existingToken?.checked || false,
          value: existingToken?.value || value,
          max: value
        });
      });

      markets.sort((a, b) => Number(b.max) - Number(a.max));
      const marketData = markets.filter((item) => item.isRwaOpen !== false);
      const rwaData = markets.filter((item) => item.isRwaOpen === false);
      setTokens(marketData);
      setTokensRwa(rwaData);
    }
  }, [walletMarketToken, selectedUnstakPositions]);

  useEffect(() => {
    if (firstLoading.current && tokens?.length) {
      firstLoading.current = false;
      toggleSelectAll();
    } else if (tokens?.length) {
      setSelectAll(tokens.every(t => t.checked));
    }
  }, [firstLoading, tokens])

  // useEffect(() => {
  //   if (!tasks.length) return;
  //   console.log('tasks data', tasks);
  //   const tsx = tasks.map(item => item?.postTransactions?.flat()[0]).filter(Boolean);
  //   console.log('tsx', tsx);

  //   const searchTransactions = async () => {
  //     try {
  //       if (!tsx.length) {
  //         throw new Error('request error');
  //       }
  //       const versionedTxns = tsx.map((base64Str) => {
  //         console.log('base64Str', base64Str)
  //         const messageBuffer = Buffer.from(base64Str, "base64");
  //         console.log('messageBuffer', messageBuffer);
  //         console.log('Buffer length:', messageBuffer.length);
  //         const message = VersionedTransaction.deserialize(messageBuffer);
  //         return message;
  //         // console.log('message', message);
  //         // return new VersionedTransaction(message);
  //       });

  //       // wallet batch signature
  //       console.log("versionedTxns", versionedTxns);
  //       const signedTransactions = await signAllTransactions(versionedTxns);
  //       console.log("signedTx Wallet signature", signedTransactions);
  //       const base64SignedTransactions = signedTransactions.map((signedTx, index) => {
  //         try {

  //           const serialized = signedTx.serialize();
  //           const signatures = signedTx.signatures;

  //           const base64Str = Buffer.from(serialized).toString('base64');

  //           return base64Str;
  //         } catch (error) {
  //           console.error(`Serialization of transaction ${index} failed:`, error);
  //           throw error;
  //         }
  //       });
  //       console.log("base64SignedTransactions Signature analysis", base64SignedTransactions);
  //       const params = tasks.map((item, index) => {
  //         console.log('RTS', item?.sessionId, base64SignedTransactions[index]);
  //         return {
  //           sessionId: item?.sessionId,
  //           transactions: [base64SignedTransactions[index]]

  //           // 
  //           // signedPostTransactions
  //           // signedStakeTransactions
  //           // signedCloseTransactions
  //         }
  //       })
  //       console.log('Wallet signature data', params);
  //       // return;
  //       await stakeComplete(params);
  //       onStakeRefresh();
  //       setIsVisible(false);
  //       setIsTransaction(false);
  //       console.log('Refresh position list data');
  //       if (noticeIdRef.current) {
  //         removeNotice(noticeIdRef.current);
  //       }
  //       // url = getTransactionUrl(pendingTx.signature, currentRpcUrl);
  //       helperNotice.success(
  //         <div>
  //           {t`Stake Order Created.`}{' '}
  //           {/* <ExternalLink href={url}>
  //             <Trans>View Tx</Trans>
  //           </ExternalLink> */}
  //         </div>
  //       );
  //     } catch (err) {
  //       setIsTransaction(false);
  //       console.error("searchTransactions error：", err);
  //       if (noticeIdRef.current) {
  //         removeNotice(noticeIdRef.current);
  //       }
  //       helperNotice.error(t`Created Order Failed.`, { description: err?.toString() });
  //     }
  //   };
  //   searchTransactions();
  // }, [tasks]);

  useEffect(() => {
    if (!tasks.length) return;
    console.log('tasks data', tasks);

    const searchTransactions = async () => {
      let url = '';
      try {
        const allTransactions = [];
        const transactionMapping = [];

        tasks.forEach((item, taskIndex) => {
          if (item?.closeTransactions?.length) {
            item.closeTransactions.forEach((txArray, arrayIndex) => {
              txArray.forEach((tx, txIndex) => {
                if (tx) {
                  allTransactions.push(tx);
                  transactionMapping.push({
                    taskIndex,
                    type: 'close',
                    arrayIndex,
                    txIndex
                  });
                }
              });
            });
          }

          if (item?.postTransactions?.length) {
            item.postTransactions.forEach((txArray, arrayIndex) => {
              txArray.forEach((tx, txIndex) => {
                if (tx) {
                  allTransactions.push(tx);
                  transactionMapping.push({
                    taskIndex,
                    type: 'post',
                    arrayIndex,
                    txIndex
                  });
                }
              });
            });
          }

          if (item?.stakeTransactions?.length) {
            item.stakeTransactions.forEach((txArray, arrayIndex) => {
              txArray.forEach((tx, txIndex) => {
                if (tx) {
                  allTransactions.push(tx);
                  transactionMapping.push({
                    taskIndex,
                    type: 'stake',
                    arrayIndex,
                    txIndex
                  });
                }
              });
            });
          }
        });

        if (!allTransactions.length) {
          throw new Error('No transactions to sign');
        }

        console.log('All transactions to sign:', allTransactions.length);

        const versionedTxns = allTransactions.map((base64Str) => {
          // const messageBuffer = Buffer.from(base64Str, "base64");
          // const message = VersionedMessage.deserialize(messageBuffer);
          // return new VersionedTransaction(message);
          const txBuffer = Buffer.from(base64Str, "base64");
          const tx = VersionedTransaction.deserialize(txBuffer);
          return tx;
        });

        console.log("versionedTxns", versionedTxns);
        const signedTransactions = await signAllTransactions(versionedTxns);
        console.log("signedTx Wallet signature", signedTransactions);

        const base64SignedTransactions = signedTransactions.map((signedTx, index) => {
          try {
            const serialized = signedTx.serialize();
            const signatures = signedTx.signatures;
            const signatureData = signatures[0];
            const base64Str = Buffer.from(serialized).toString('base64');

            console.log(`Transaction ${index} serialized successfully:`, {
              "Original": serialized.length,
              "Base64": base64Str.length,
              "signaturesLength": signedTx.signatures.length,
              "Base58": bs58.encode(signatureData)
            });

            return base64Str;
          } catch (error) {
            console.error(`Serialization of transaction ${index} failed:`, error);
            throw error;
          }
        });

        console.log("base64SignedTransactions", base64SignedTransactions);

        const taskResults = tasks.map((item) => {
          const result = {
            sessionId: item?.sessionId,
            signedCloseTransactions: [],
            signedPostTransactions: [],
            signedStakeTransactions: []
          };

          if (item?.closeTransactions?.length) {
            result.signedCloseTransactions = item.closeTransactions.map(() => []);
          }

          if (item?.postTransactions?.length) {
            result.signedPostTransactions = item.postTransactions.map(() => []);
          }

          if (item?.stakeTransactions?.length) {
            result.signedStakeTransactions = item.stakeTransactions.map(() => []);
          }

          return result;
        });

        transactionMapping.forEach((mapping, signedIndex) => {
          const { taskIndex, type, arrayIndex } = mapping;
          const signedTx = base64SignedTransactions[signedIndex];

          if (type === 'close') {
            taskResults[taskIndex].signedCloseTransactions[arrayIndex].push(signedTx);
          } else if (type === 'post') {
            taskResults[taskIndex].signedPostTransactions[arrayIndex].push(signedTx);
          } else if (type === 'stake') {
            taskResults[taskIndex].signedStakeTransactions[arrayIndex].push(signedTx);
          }
        });

        const params = taskResults.map((result) => {
          console.log('Task result:', result, result.sessionId, {
            close: result.signedCloseTransactions?.length || 0,
            post: result.signedPostTransactions?.length || 0,
            stake: result.signedStakeTransactions?.length || 0
          });

          return {
            sessionId: result.sessionId,
            signedCloseTransactions: result.signedCloseTransactions || [],
            signedPostTransactions: result.signedPostTransactions || [],
            signedStakeTransactions: result.signedStakeTransactions || []
          };
        });

        console.log('Wallet signature data', params);

        const signData = await stakeComplete(params);
        // console.log('signData', signData)
        signData.forEach((item) => {
          const { closeResult, postResult, stakeResult, error, isError = false } = item || {};
          if (!error && (!closeResult?.success || !postResult?.success || !stakeResult?.success)) {
            throw new Error(t`Staking failed`);
          } else if (isError) {
            throw new Error(t`Staking failed`);
          }
        })
        onStakeRefresh();
        setIsVisible(false);
        setIsTransaction(false);
        console.log('Refresh position list data');

        if (noticeIdRef.current) {
          removeNotice(noticeIdRef.current);
        }

        helperNotice.success(
          <div>
            {t`Staking order created.`}
          </div>
        );
      } catch (err) {
        setIsTransaction(false);
        console.error("searchTransactions error:", err);
        if (noticeIdRef.current) {
          removeNotice(noticeIdRef.current);
        }
        helperNotice.error(t`Failed to create staking order.`, {
          description: err?.toString(),
          tradingErrorInfo: { actionName: 'Stake', errorData: err },
        });
      }
    };

    searchTransactions();
  }, [tasks]);

  useEffect(() => {
    if (['Claim'].includes(stakeType) && selectedClaimGtPositions?.length) {
      let amountTotal: BN = new BN('0');
      selectedClaimGtPositions.forEach((item: StakeGlobalState) => {
        amountTotal = amountTotal.add(new BN(item.gtAmount))
      })
      const gtAmount = formatAmount(amountTotal, decimals, 2, true);
      setgtAmountTotal(gtAmount < 0.01 ? '<0.01' : gtAmount);
    } else if (['Unstake'].includes(stakeType) && tokens?.length) {
      let amountTotal: BN = new BN('0');
      tokens.forEach((item: StakeGlobalState) => {
        if (item.checked) {
          amountTotal = amountTotal.add(new BN(item.gtAmount))
        }
      })
      const gtAmount = formatAmount(amountTotal, decimals, 2, true);
      setgtAmountTotal(gtAmount);
    }
  }, [tokens])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isClickInside = (event.target as HTMLElement).closest('.token-info');
      if (!isClickInside) {
        setFocusIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleSelectAll = () => {
    const newValue = !selectAll;
    setFocusIndex('');
    setSelectAll(newValue);
    setTokens(tokens.map((t) => ({ ...t, checked: newValue, value: newValue ? (t.value || t.max) : '' })));
  };

  const toggleToken = (item) => {
    setFocusIndex('');
    const data = tokens.map((t) => {
      if (stakeType === 'Stake') {
        const list = t.marketToken.toString() === item.marketToken.toString() ? { ...t, checked: !t.checked } : t;
        return list
      } else if (stakeType === 'Unstake') {
        return t.positionId.toString() === item.positionId.toString() ? { ...t, checked: !t.checked } : t
      }
    });

    const newData = data.map((j) => {
      return {
        ...j,
        value: !j.checked ? '' : (j.value || j.max)
      }
    });

    // setSelectAll(newData.every(t => t.checked));

    if (stakeType === 'Unstake') {
      let amountTotal = new BN('0');
      newData.forEach((item) => {
        if (item.checked) {
          // gtAmount += Number(item.gtAmount);
          amountTotal = amountTotal.add(new BN(item.gtAmount));
        }
      });
      const gtAmount = formatAmount(amountTotal, decimals, 2, true);
      setgtAmountTotal(gtAmount);
    }
    setTokens(newData);
  };

  const handleOnMax = (index: number) => {
    // const max = formatAmount(tokens[index].balance, tokens[index].decimals, tokens[index].decimals);
    // handleOnUserInput(index, max);
    handleOnUserInput(index, tokens[index].max)
  }

  const handleOnUserInput = (index: number, value: number | string) => {
    const newTokens = [...tokens];
    const { max, decimals, unitPrice, isMinUsd, poolType } = newTokens[index] || {};
    const inputValue = Number(value) > Number(max) ? max : value;
    const rateValue = Number((inputValue / max) * 100).toFixed(0);

    if (stakeType === 'Stake') {
      const { minStakeValue } = stakeGloablState;
      const minAmountToken = formatAmount(isMinUsd, decimals, 2);
      // const minAmount = formatCeilToDecimals(minAmountToken, 2);
      // const itemAmount = formatParseUsdToBN(value, decimals);
      // const itemPriceUsd = itemAmount.mul(unitPrice);
      const minStakeUsd = formatUsd(minStakeValue);

      if (Number(value) >= Number(minAmountToken)) {
        newTokens[index].isMinText = '';
      } else {
        newTokens[index].isMinText = `${t`Minimum stake is`} ${minAmountToken}${poolType} (≈${minStakeUsd})`;
      }
    }

    if (rateValue >= 0) {
      setRate(rateValue);
    }

    newTokens[index].value = inputValue;
    newTokens[index].checked = true;
    setTokens(newTokens);
  }

  const handleOnFocus = (index: number) => {
    setFocusIndex(index);

    if (inputRefs.current[index]) {
      inputRefs.current[index].focus();
    }

    const newTokens = [...tokens];
    const { max, value } = newTokens[index] || {};
    const inputValue = Number(value) > Number(max) ? max : value;
    const rateValue = Number((inputValue / max) * 100).toFixed(0);
    if (rateValue >= 0) {
      setRate(rateValue);
    }
  }

  const handleOnBlur = () => {
    // setRate(0);
    // if (focusIndex >= 0 && focusIndex < tokens.length) {
    //   const currentToken = tokens[focusIndex];
    //   if (currentToken.value < 2) {
    //     const newTokens = [...tokens];
    //     newTokens[focusIndex].value = 2;
    //     setTokens(newTokens);
    //   }
    // }
  }

  const handleSubmitData = async () => {
    if (tokensRwa.length > 0 && tokens.length === 0) return;

    const user = store.provider.publicKey;
    const stateAddress = stakeGloablState.stateAddress;

    if (stakeType === 'Stake') {
      if (!tokens.length) {
        navigate(`/pools`);
        return;
      }
      setIsTransaction(true);
      noticeIdRef.current = helperNotice.info(t`Creating staking order...`);
      const ginseng = tokens.filter((item) => item.checked).map((item) => {
        const { value, decimals, poolType: lpTokenKind, marketToken: lpTokenMint, controllerIndex, balance } = item;
        const inputValue = formatParseUsdToBN(value, decimals);
        const amount = inputValue.gte(balance) ? balance : inputValue;
        // const inputValue = Number(value);
        // const amount = inputValue >= balance ? Number(balance) : inputValue;

        console.log('value amount', value)
        return {
          lpTokenKind,
          lpTokenMint,
          controllerIndex: Number(controllerIndex) + '',
          lpProgramId: stakeProgram.programId,
          amount: amount?.toString(),
          owner,
          oracle: ORACLE_PUBKEY
        }
      });
      await stakeMany(ginseng);
    } else if (stakeType === 'Unstake') {
      const positions = tokens.filter(item => item.checked);
      if (!positions.length) return;

      try {
        const MAX_INSTRUCTIONS_PER_TX = 3;
        noticeIdRef.current = helperNotice.info(t`Creating unstaking order...`);
        setIsTransaction(true);

        const [userPda] = findUserPDA(GMX_SOLANA_STORE_ADDRESS, user);
        const connection = store.provider.connection;

        let needsPrepareUser = false;
        try {
          const userAccount = await store.account.userHeader.fetch(userPda);
          if (!userAccount) {
            needsPrepareUser = true;
          }
        } catch (error) {
          needsPrepareUser = true;
        }

        const transactions: Transaction[] = [];
        let currentTx = new Transaction();
        let ixCount = 0;

        if (needsPrepareUser) {
          const prepareUserIx = await store.methods
            .prepareUser()
            .accountsStrict({
              owner: user,
              store: GMX_SOLANA_STORE_ADDRESS,
              user: userPda,
              systemProgram: SystemProgram.programId,
            })
            .instruction();
          currentTx.add(prepareUserIx);
        }

        for (const item of positions) {
          const {
            positionId,
            positionAddress,
            vault,
            poolType,
            marketToken,
            lpMint,
            controller,
            value,
            decimals
          } = item || {};

          const tokenProgram = poolType === 'GLV' ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
          const userLpToken = getTokenEscrow(user, new PublicKey(marketToken), tokenProgram);
          const amount = formatParseUsdToBN(value, decimals);

          const prepareUnStakeTokenEscrow = await prepareAssociatedTokenAccounts(
            store,
            user,
            user,
            [new PublicKey(marketToken)],
            tokenProgram
          );
          
          const ix = await stakeProgram.methods.unstakeLp(positionId, amount)
            .accounts({
              store: GMX_SOLANA_STORE_ADDRESS,
              owner: user,
              globalState: stateAddress,
              controller,
              lpMint,
              gtProgram: STORE_PROGRAM_ID,
              position: positionAddress,
              position_vault: vault,
              gtUser: userPda,
              userLpToken: userLpToken,
              eventAuthority: new PublicKey('8a4wJ2bMiH6XWDZ7biTnejkss8VG7GMwd9Mg6F5fDfHF'),
              tokenProgram: tokenProgram,
            }).instruction();

          currentTx.add(...prepareUnStakeTokenEscrow);
          currentTx.add(ix);
          ixCount++;

          if (ixCount >= MAX_INSTRUCTIONS_PER_TX) {
            transactions.push(currentTx);
            currentTx = new Transaction();
            ixCount = 0;
          }
        }

        if (ixCount > 0) {
          transactions.push(currentTx);
        }

        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transactions.forEach(tx => {
          tx.recentBlockhash = blockhash;
          tx.feePayer = user;
        });

        const signedTransactions = await store.provider.wallet.signAllTransactions(transactions);

        const results = [];
        for (const [index, signedTx] of signedTransactions.entries()) {
          try {
            const txid = await connection.sendRawTransaction(signedTx.serialize(), {
              skipPreflight: false,
              preflightCommitment: 'confirmed',
            });
            results.push(txid);
          } catch (err) {
            console.error(`Tx ${index} Error:`, err);
            throw err;
          }
        }

        if (noticeIdRef.current) {
          removeNotice(noticeIdRef.current);
        }

        helperNotice.success(
          <div>{t`Unstaking order created.`}</div>
        );

      } catch (err) {
        if (noticeIdRef.current) {
          removeNotice(noticeIdRef.current);
        }
        const errorMsg = err instanceof Error ? err.message : String(err);
        errorLogRequest(errorMsg, {
          route: 'Unstake',
          owner: user || ''
        });
        helperNotice.error(t`Failed to create unstaking order.`, {
          tradingErrorInfo: { actionName: 'Unstake', errorData: err },
        });
        console.error('Batch Unstake error:', err);
      } finally {
        setIsVisible(false);
        setIsTransaction(false);
        onStakeRefresh();
      }
    } else if (stakeType === 'Claim') {
      setIsTransaction(true);
      const [userPda] = findUserPDA(GMX_SOLANA_STORE_ADDRESS, user);

      const BATCH_SIZE = 4;
      const transactions: Transaction[] = [];
      const connection = store.provider.connection;

      let needsPrepareUser = false;
      try {
        const userAccount = await store.account.userHeader.fetch(userPda);
        if (!userAccount) {
          needsPrepareUser = true;
        }
      } catch (error) {
        needsPrepareUser = true;
      }

      try {
        noticeIdRef.current = helperNotice.info(t`Creating GT claim order...`);

        let currentTx = new Transaction();
        let ixCount = 0;

        if (needsPrepareUser) {
          const prepareUserIx = await store.methods
            .prepareUser()
            .accountsStrict({
              owner: user,
              store: GMX_SOLANA_STORE_ADDRESS,
              user: userPda,
              systemProgram: SystemProgram.programId,
            })
            .instruction();
          currentTx.add(prepareUserIx);
        }

        for (const item of selectedClaimGtPositions) {
          const { positionId, positionAddress: position, controller } = item;

          const ix = await stakeProgram.methods.claimGt(positionId)
            .accounts({
              globalState: stateAddress,
              controller,
              store: GMX_SOLANA_STORE_ADDRESS,
              gtProgram: STORE_PROGRAM_ID,
              position,
              owner: user,
              gtUser: userPda,
              eventAuthority: new PublicKey("8a4wJ2bMiH6XWDZ7biTnejkss8VG7GMwd9Mg6F5fDfHF")
            }).instruction();

          currentTx.add(ix);
          ixCount++;

          if (ixCount === BATCH_SIZE) {
            transactions.push(currentTx);
            currentTx = new Transaction();
            ixCount = 0;
          }
        }
        if (ixCount > 0) {
          transactions.push(currentTx);
        }
      } catch (err) {
        console.error('Failed to build claimGt instruction:', err)
      }

      try {
        const { blockhash } = await connection.getLatestBlockhash();

        transactions.forEach(tx => {
          tx.recentBlockhash = blockhash;
          tx.feePayer = user;
        });

        const signedTransactions = await store.provider.wallet.signAllTransactions(transactions);

        for (const signedTx of signedTransactions) {
          const txid = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          });
          // console.log('Trade txid:', txid);
        }

        if (noticeIdRef.current) {
          removeNotice(noticeIdRef.current);
        }
        helperNotice.success(t`GT claim order created.`);
      } catch (err) {
        if (noticeIdRef.current) {
          removeNotice(noticeIdRef.current);
        }
        console.error('claimGt err', err);
        helperNotice.error(t`Failed to create GT claim order.`, {
          tradingErrorInfo: { actionName: 'Claim GT', errorData: err },
        });
        errorLogRequest(err, {
          route: 'claimGt',
          owner: user || ''
        });
      } finally {
        setIsVisible(false);
        setIsTransaction(false);
        onStakeRefresh();
      }
    }
  }

  const totalStake = useMemo(() => {
    try {
      let totalStakeUsd = new BN(0);
      const data = tokens.filter((t) => t.checked);
      data.forEach((item) => {
        const itemAmount = formatParseUsdToBN(item.value, item.decimals);
        const itemPriceUsd = itemAmount.mul(item.unitPrice);
        totalStakeUsd = totalStakeUsd.add(itemPriceUsd);
      });
      return formatUsd(totalStakeUsd);
    } catch (err) {
      console.error('totalStake err', err);
      return '0';
    }
  }, [tokens]);

  const isButtonDisabled = useMemo(() => {
    const data = tokens.filter((t) => t.checked);

    if (isTransaction || (tokensRwa.length > 0 && tokens.length === 0)) {
      return true;
    }

    if (stakeType === 'Stake') {
      if (!tokens.length && !data.length) {
        return false;
      } else if (tokens.length && !data.length) {
        return true;
      } else if (data.length > 0 && data.filter((t) => t.checked && (t.isMinText || Number(t.value) <= 0)).length > 0) {
        return true;
      } else {
        return false;
      }
      // return data.length > 0 && data.filter((t) => t.isMinText || Number(t.value) <= 0).length <= 0;
    } else if (stakeType === 'Unstake') {
      if (tokens.length && !data.length) {
        return true;
      } else if (data.length > 0 && data.filter((t) => t.checked && Number(t.value) <= 0).length > 0) {
        return true;
      } else {
        return false;
      }
    }

    return false;
  }, [tokens, tokensRwa, stakeType, isTransaction]);

  const renderTooltipContent = useCallback(() => {
    return (
      <div className='stake-glv-gm-tooltip-content'>
        <div className='tooltip-item'>
          <p>
            <Trans>All unclaimed GT from unstaked positions will be claimed.</Trans>
          </p>
        </div>
      </div>
    );
  }, []);

  return (
    <Modal
      className="StakeEditor-modal"
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={modalTitle}
      closeOnClickModal={false}
      qa="stake-confirmation-box"
      footerContent={
        <div className="footer-content">
          <div className="total-stake">
            {
              tokens.length > 0 && ["Unstake", "Stake"].includes(stakeType) && (
                <p className="item">
                  <span>
                    <Trans>Total</Trans>&nbsp;
                    {
                      stakeType === "Stake" ? (
                        <Trans>Stake</Trans>
                      ) : (
                        <Trans>Unstake</Trans>
                      )
                    }
                  </span>
                  <span className="tabular-nums">{totalStake}</span>
                </p>
              )
            }
            {
              stakeType === "Unstake" && (
                <div className="item claim">
                  <Tooltip
                    maxAllowedWidth={280}
                    handle={
                      <p className='label'>
                        <Trans>Claim GT</Trans>
                        <img
                          className="icon"
                          src={IconTooltips}
                        />
                      </p>
                    }
                    position="bottom-end"
                    renderContent={renderTooltipContent}
                  />
                  <span>+{gtAmountTotal} GT</span>
                </div>
              )
            }
          </div>

          {
            ["Unstake", "Stake"].includes(stakeType) ? (
              <Button
                disabled={isButtonDisabled || isTransaction}
                variant="primary"
                className={`btn ${isTransaction ? "disabled-button loading-spinner" : isButtonDisabled ? "disabled-button" : ""}`}
                onClick={handleSubmitData}>{!tokens.length && tokensRwa.length > 0 ? t`Market Is Not Open` : !tokens.length ? `${t`Buy`} GLV/GM` : (isButtonDisabled && !isTransaction ? t`Enter an amount` : (stakeType === 'Stake' ? <Trans>Stake</Trans> : <Trans>Unstake</Trans>))}
              </Button>
            ) : (
              <div className='btn-claim'>
                <Button
                  className={`btn`}
                  onClick={() => {
                    setIsVisible(false)
                  }}
                  variant="primary"><Trans>Cancel</Trans></Button>
                <Button
                  disabled={isTransaction}
                  className={`btn ${isTransaction ? "disabled-button loading-spinner" : ""}`}
                  onClick={handleSubmitData}
                  variant="primary"><Trans>Claim</Trans></Button>
              </div>
            )
          }
        </div>
      }
    >
      <div>
        <div className="modal-view">
          {
            tokens.length > 0 && isShowCheckBox && (
              <div className="top">
                <img
                  className="icon"
                  onClick={toggleSelectAll}
                  src={selectAll ? IconSelectEd : IconSelect}
                />
                <span>
                  <Trans>Select All GLV/GM Tokens</Trans>
                  <em>{tokens.filter(item => item.checked).length}</em>
                </span>
              </div>
            )
          }

          <div className="content">
            {["Unstake", "Stake"].includes(stakeType) && tokens.map((token, index) => (
              <div key={index}>
                <div className="item">
                  <img
                    className="icon"
                    onClick={() => toggleToken(token)}
                    src={token.checked ? IconSelectEd : IconSelect}
                  />
                  <div
                    className={`token-info ${focusIndex === index ? "token-info-active" : ""} ${token?.isMinText ? "token-info-active-error" : ""}`}
                    onClick={() => handleOnFocus(index)}
                  >
                    <div className="max">
                      <span>{stakeType}</span>
                      <span
                        className='tabular-nums cursor-pointer'
                        onClick={() => handleOnMax(index)}
                      ><Trans>Max</Trans>:<em>{token?.decimals ? formatAmount(token?.balance, token?.decimals, 2) : '-'}</em></span>
                    </div>
                    <div className="market">
                      <div className="symbol">
                        <div className="token-symbol">
                          <img
                            className='token-icon'
                            src={getIconUrlPath(token.symbol, 24)}
                            width={30}
                            height={30}
                          />
                          {
                            token?.poolType === 'GM' && (
                              <div className="ls-img">
                                <img
                                  src={getIconUrlPath(token?.symbolPair?.split('-')[0], 24)}
                                  alt="long-token-symbol"
                                  width={16}
                                />
                                <img
                                  src={getIconUrlPath(token?.symbolPair?.split('-')[1], 24)}
                                  alt="short-token-symbol"
                                  width={16}
                                />
                              </div>
                            )
                          }
                        </div>
                        <div className="token-name">
                          <span>{token.poolType === "GLV" ? `${token?.symbolAnother}` : `${token.poolType}:${token.displaySymbol}`}</span>
                          <span>[{token.symbolPair}]</span>
                        </div>
                      </div>
                      <div className="input">
                        <NumberInput
                          inputRef={(el) => (inputRefs.current[index] = el)}
                          disabled={isInputDisabled}
                          value={token.value}
                          className="Exchange-swap-input"
                          onValueChange={(e) => {
                            const value = e.target.value;
                            handleOnUserInput(index, value);
                          }}
                          onFocus={() => handleOnFocus(index)}
                          onBlur={handleOnBlur}
                          placeholder="0.0"
                          qa={'stake-input'}
                        />
                      </div>
                    </div>
                    {
                      focusIndex === index && <>
                        <div>
                          <SliderComponent
                            value={rate}
                            onInputChange={(v) => {
                              let value = Number(token.max * (v / 100)).toFixed(token?.decimals);
                              // setTokens(prev =>
                              //   prev.map((item, cIndex) => cIndex === focusIndex ? { ...item, value, isMinText: '' } : item)
                              // );
                              setRate(v);
                              handleOnUserInput(index, value)
                            }}
                          />
                        </div>
                      </>
                    }
                    {
                      stakeType === "Unstake" && (
                        <div className='apr'>
                          <span><Trans>Current APR</Trans></span>
                          <span className="tabular-nums">{token.currentApr}</span>
                        </div>
                      )
                    }
                  </div>
                </div>
                {
                  token?.isMinText && (
                    <div className='min-error'>
                      <span>{token?.isMinText}</span>
                    </div>
                  )
                }
              </div>
            ))}
            {
              !tokens.length && ["Unstake", "Stake"].includes(stakeType) && (
                <div className='no-data'>
                  <p><Trans>No GLV/GM found in your wallet.</Trans></p>
                  <p><Trans>Please buy some first.</Trans></p>
                </div>
              )
            }
            {
              ["Claim"].includes(stakeType) && (
                <div className='no-data'>
                  <p><Trans>You are about to claim {gtAmountTotal} GT</Trans></p>
                  <p><Trans>from your stake position.</Trans></p>
                  <p><Trans>They’ll go straight to your GT wallet.</Trans></p>
                </div>
              )
            }
          </div>
        </div>
        {
          tokensRwa && tokensRwa.length > 0 && (
            <div className="modal-view not-open-rwa">
              <div className="top">
                <img
                  className="icon"
                  src={IconSelectedAll}
                />
                <span>
                  {stakeType === 'Unstake' ? (
                    <Trans>RWA GLV/GM can only be unstaked when the market is open.</Trans>
                  ) : (
                    <Trans>RWA GLV/GM can only be staked when the market is open.</Trans>
                  )}
                </span>
              </div>
              <div className="content">
                {["Unstake", "Stake"].includes(stakeType) && tokensRwa.map((token, index) => (
                  <div key={index}>
                    <div className="item">
                      <img
                        className="icon"
                        src={IconSelectedAll}
                      />
                      <div className="token-info">
                        <div className="max">
                          <span>{stakeType}</span>
                          <span
                            className='tabular-nums'
                          ><Trans>Max</Trans>:<em>{token?.decimals ? formatAmount(token?.balance, token?.decimals, 2) : '-'}</em></span>
                        </div>
                        <div className="market">
                          <div className="symbol">
                            <div className="token-symbol">
                              <img
                                className='token-icon'
                                src={getIconUrlPath(token.symbol, 24)}
                                width={30}
                                height={30}
                              />
                              {
                                token?.poolType === 'GM' && (
                                  <div className="ls-img">
                                    <img
                                      src={getIconUrlPath(token?.symbolPair?.split('-')[0], 24)}
                                      alt="long-token-symbol"
                                      width={18}
                                    />
                                    <img
                                      src={getIconUrlPath(token?.symbolPair?.split('-')[1], 24)}
                                      alt="short-token-symbol"
                                      width={18}
                                    />
                                  </div>
                                )
                              }
                            </div>
                            <div className="token-name">
                              <span>{token.poolType === "GLV" ? `${token?.symbolAnother}` : `${token.poolType}:${token.displaySymbol}`}</span>
                              <span>[{token.symbolPair}]</span>
                            </div>
                          </div>
                          <div className="input">
                            <NumberInput
                              disabled={true}
                              value={token.value}
                              className="Exchange-swap-input"
                              onValueChange={(e) => {
                                const value = e.target.value;
                                handleOnUserInput(index, value);
                              }}
                              placeholder="0.0"
                              qa={'stake-input'}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }
      </div>
    </Modal>
  );
}
