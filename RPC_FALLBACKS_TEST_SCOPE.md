# Test Scope: RPC Fallbacks Improvements (GMX-118)

## Issue Summary
This test scope covers improvements to RPC fallback mechanisms to address problems with primary/secondary RPC failures during multicall operations, particularly when both RPCs fail simultaneously or return non-standard errors (503, CORS).

**Related PR:** [#2029 RPC Fallbacks Improvements](https://github.com/gmx-io/gmx-interface/pull/2029/files)

---

## Context

### Current Behavior
- **Primary RPC**: Selected by `bestRpcTracker` based on fastest response time
- **Secondary RPC**: Typically Alchemy fallback
- **Fallback Mechanism**: Uses `SlidingWindowFallbackSwitcher` to switch to secondary RPC after 3 errors within 1 minute
- **Problem**: `bestRpcTracker` uses simple probes that don't catch issues with large multicall chunks

### Issues to Address
1. **503 Service Unavailable Responses**: DRPC was valid during probing but returned 503 during actual usage
2. **CORS Issues**: 1RPC always returns CORS errors
3. **Simultaneous Failures**: No mechanism to replace both primary and secondary RPC when both fail
4. **Poor 3G/4G Performance**: Users on slow connections experience loading loops
5. **Inadequate Error Detection**: Need better way to identify failing RPCs beyond simple probes

---

## Test Scope

### 1. RPC Selection & Tracking

#### 1.1 bestRpcTracker Functionality
**Objective**: Verify RPC selection logic works correctly

- [ ] **TC-1.1.1**: Verify primary RPC is selected based on fastest response time
  - **Steps**:
    1. Monitor RPC probing results in console (debug mode)
    2. Verify fastest RPC is selected as primary
    3. Check localStorage for saved RPC selection
  - **Expected**: Fastest valid RPC becomes primary
  - **Chains**: Arbitrum, Avalanche, Botanix

- [ ] **TC-1.1.2**: Verify secondary RPC selection
  - **Steps**:
    1. Check if user is large account
    2. For large accounts: verify secondary is public RPC (fastest response time)
    3. For regular accounts: verify secondary is Alchemy fallback
  - **Expected**: Correct secondary RPC based on account type
  - **Chains**: Arbitrum, Avalanche

- [ ] **TC-1.1.3**: Verify block number validation
  - **Steps**:
    1. Mock RPC returning future block number (>1000 blocks ahead)
    2. Verify RPC is marked as invalid
    3. Mock RPC lagging (>50 blocks behind)
    4. Verify RPC is marked as invalid
  - **Expected**: Invalid RPCs are excluded from selection
  - **Test Type**: Unit/Integration

- [ ] **TC-1.1.4**: Verify probe timeout handling (10s)
  - **Steps**:
    1. Mock RPC with slow response (>10s)
    2. Verify probe fails and RPC is marked unsuccessful
  - **Expected**: Slow RPCs are not selected
  - **Test Type**: Unit/Integration

- [ ] **TC-1.1.5**: Verify localStorage persistence
  - **Steps**:
    1. Select RPC and save to localStorage
    2. Reload page within 5 minutes
    3. Verify same RPC is used
    4. Wait >5 minutes and reload
    5. Verify new probe is performed
  - **Expected**: RPC persists for 5 minutes
  - **Test Type**: E2E

#### 1.2 RPC Probing Quality
**Objective**: Verify probes accurately reflect RPC health

- [ ] **TC-1.2.1**: Verify probe uses multicall simulation
  - **Steps**:
    1. Examine probe request structure
    2. Verify it uses DataStore.getUint via Multicall.blockAndAggregate
    3. Verify it tests actual smart contract interaction
  - **Expected**: Probe is similar to real multicall usage
  - **Test Type**: Code Review/Integration

- [ ] **TC-1.2.2**: Test probe against RPCs with different error types
  - **Steps**:
    1. Mock RPC returning 503 on probes
    2. Mock RPC returning CORS errors
    3. Mock RPC with network timeouts
    4. Verify all are marked as unsuccessful
  - **Expected**: All error types are caught during probing
  - **Test Type**: Integration

- [ ] **TC-1.2.3**: Verify probe sample fields are valid
  - **Steps**:
    1. Check `PROBE_SAMPLE_MARKET` addresses for each chain
    2. Check `HASHED_MARKET_CONFIG_KEYS` contains correct keys
    3. Verify probe returns valid data (value > 0)
  - **Expected**: All chains have valid probe configuration
  - **Chains**: Arbitrum, Avalanche, Botanix, Arbitrum Sepolia, Avalanche Fuji

---

### 2. Fallback Switching Mechanism

#### 2.1 SlidingWindowFallbackSwitcher
**Objective**: Verify fallback switching logic

- [ ] **TC-2.1.1**: Verify threshold-based switching
  - **Steps**:
    1. Trigger 2 errors within 1 minute
    2. Verify still using primary RPC
    3. Trigger 3rd error within 1 minute
    4. Verify switched to fallback RPC
  - **Expected**: Switch to fallback after 3 errors in 1 minute
  - **Test Type**: Unit

- [ ] **TC-2.1.2**: Verify sliding window cleanup
  - **Steps**:
    1. Trigger 2 errors
    2. Wait >1 minute
    3. Trigger 2 more errors
    4. Verify still using primary (old errors expired)
  - **Expected**: Old errors outside window don't count
  - **Test Type**: Unit

- [ ] **TC-2.1.3**: Verify restore timeout (5 minutes)
  - **Steps**:
    1. Trigger fallback mode
    2. Wait 5 minutes
    3. Verify switched back to primary
    4. Check metrics for fallback.off event
  - **Expected**: Automatically restore after 5 minutes
  - **Test Type**: Integration

- [ ] **TC-2.1.4**: Verify restore timer resets on new fallback
  - **Steps**:
    1. Enter fallback mode
    2. Wait 4 minutes
    3. Trigger new error (while in fallback)
    4. Verify restore timer resets to 5 minutes
  - **Expected**: Timer resets on each new switch to fallback
  - **Test Type**: Unit

---

### 3. Multicall Error Handling

#### 3.1 Initial Multicall Request
**Objective**: Verify error handling for primary RPC

- [ ] **TC-3.1.1**: Verify timeout handling (20s)
  - **Steps**:
    1. Mock primary RPC with >20s response time
    2. Make multicall request
    3. Verify fallback to secondary RPC
    4. Check timeout metric is emitted
  - **Expected**: Falls back to secondary on timeout
  - **Test Type**: Integration

- [ ] **TC-3.1.2**: Verify network error handling
  - **Steps**:
    1. Mock primary RPC with network error (connection refused)
    2. Make multicall request
    3. Verify fallback to secondary RPC
    4. Check error metric is emitted
  - **Expected**: Falls back to secondary on network error
  - **Test Type**: Integration

- [ ] **TC-3.1.3**: Verify HTTP 503 handling
  - **Steps**:
    1. Mock primary RPC returning 503 Service Unavailable
    2. Make multicall request
    3. Verify fallback to secondary RPC
    4. Verify fallback switcher is triggered
  - **Expected**: Falls back and triggers switcher
  - **Test Type**: Integration
  - **Priority**: HIGH (reported in issue)

- [ ] **TC-3.1.4**: Verify CORS error handling
  - **Steps**:
    1. Mock primary RPC with CORS error
    2. Make multicall request
    3. Verify fallback to secondary RPC
    4. Check error is logged
  - **Expected**: Falls back to secondary on CORS
  - **Test Type**: Integration
  - **Priority**: HIGH (reported for 1RPC)

- [ ] **TC-3.1.5**: Verify contract error handling
  - **Steps**:
    1. Mock primary RPC with contract revert error
    2. Make multicall request
    3. Verify multicall result has success=false
    4. Verify fallback to secondary RPC
    5. Check error metric includes contract error details
  - **Expected**: Contract errors trigger fallback
  - **Test Type**: Integration

#### 3.2 Fallback Multicall Request
**Objective**: Verify error handling when secondary RPC also fails

- [ ] **TC-3.2.1**: Verify secondary RPC timeout
  - **Steps**:
    1. Primary RPC fails/times out
    2. Secondary RPC also times out
    3. Verify error is thrown
    4. Check both timeout metrics are emitted
  - **Expected**: Request fails with error after both RPCs fail
  - **Test Type**: Integration
  - **Priority**: HIGH (simultaneous failure scenario)

- [ ] **TC-3.2.2**: Verify secondary RPC error
  - **Steps**:
    1. Primary RPC fails
    2. Secondary RPC returns error
    3. Verify error is thrown
    4. Check both error metrics are emitted
  - **Expected**: Request fails after both RPCs fail
  - **Test Type**: Integration

- [ ] **TC-3.2.3**: Verify no infinite retry loop
  - **Steps**:
    1. Both primary and secondary fail
    2. Verify only 2 requests made (no retry loop)
    3. Check error handling is graceful
  - **Expected**: Exactly 2 requests (primary + fallback), no loop
  - **Test Type**: Integration
  - **Priority**: HIGH (prevents infinite loops)

---

### 4. RPC Provider Behavior

#### 4.1 Specific Provider Issues
**Objective**: Test known problematic RPC providers

- [ ] **TC-4.1.1**: Test DRPC (Arbitrum)
  - **Steps**:
    1. Force use of DRPC as primary RPC
    2. Perform various multicalls (positions, markets, orders)
    3. Monitor for 503 errors
    4. If 503 occurs, verify fallback works
  - **Expected**: Either stable or proper fallback on 503
  - **Chain**: Arbitrum
  - **Priority**: HIGH (specific issue mentioned)

- [ ] **TC-4.1.2**: Test 1RPC (Arbitrum - currently disabled)
  - **Steps**:
    1. Note: 1RPC is commented out due to CORS
    2. If re-enabled, verify CORS handling
    3. Verify proper fallback
  - **Expected**: CORS errors are handled gracefully
  - **Chain**: Arbitrum
  - **Priority**: MEDIUM (currently disabled)

- [ ] **TC-4.1.3**: Test Alchemy fallback providers
  - **Steps**:
    1. Force use of Alchemy as both primary and secondary
    2. Verify stable operation
    3. Check response times
  - **Expected**: Stable operation with good performance
  - **Chains**: Arbitrum, Avalanche, Botanix
  - **Priority**: HIGH (main fallback)

- [ ] **TC-4.1.4**: Test all public RPCs in RPC_PROVIDERS
  - **Steps**:
    1. Iterate through each RPC in RPC_PROVIDERS for each chain
    2. Test basic multicall operations
    3. Record success rate and response time
    4. Identify any consistently failing RPCs
  - **Expected**: Document RPC reliability
  - **Chains**: All
  - **Priority**: MEDIUM (maintenance task)

#### 4.2 Large vs Regular Accounts
**Objective**: Verify RPC selection differs correctly

- [ ] **TC-4.2.1**: Test regular account RPC selection
  - **Steps**:
    1. Ensure account is not "large"
    2. Verify public RPCs are probed
    3. Verify primary is fastest public RPC
    4. Verify secondary is from FALLBACK_PROVIDERS
  - **Expected**: Uses public RPCs and Alchemy fallback
  - **Test Type**: E2E

- [ ] **TC-4.2.2**: Test large account RPC selection
  - **Steps**:
    1. Set account as "large"
    2. Verify private RPCs are probed (PRIVATE_RPC_PROVIDERS)
    3. Verify primary is private RPC
    4. Verify secondary is fastest public RPC
  - **Expected**: Uses private/Alchemy for primary, public for secondary
  - **Test Type**: E2E

---

### 5. Performance & Reliability

#### 5.1 Slow Network Conditions
**Objective**: Test on poor connections (3G/4G)

- [ ] **TC-5.1.1**: Test on throttled 3G connection
  - **Steps**:
    1. Use Chrome DevTools to throttle to 3G
    2. Load application
    3. Monitor for loading loops
    4. Check if multicalls complete
    5. Measure time to interactive
  - **Expected**: Application loads without infinite loops
  - **Priority**: HIGH (user complaint from screenshots)

- [ ] **TC-5.1.2**: Test on throttled 4G connection
  - **Steps**:
    1. Use Chrome DevTools to throttle to 4G
    2. Load application
    3. Perform trading operations
    4. Measure response times
  - **Expected**: Acceptable performance, no hangs
  - **Priority**: HIGH (user complaint from screenshots)

- [ ] **TC-5.1.3**: Test RPC timeout behavior on slow connections
  - **Steps**:
    1. Throttle to slow 3G (500kbps, 2000ms latency)
    2. Verify multicall timeout (20s) is appropriate
    3. Check if fallback improves experience
  - **Expected**: Reasonable timeout, effective fallback
  - **Priority**: MEDIUM

#### 5.2 High Load Scenarios
**Objective**: Test under stress

- [ ] **TC-5.2.1**: Test with large multicall chunks
  - **Steps**:
    1. Create multicall with 100+ contract calls
    2. Execute on various RPCs
    3. Monitor for failures
    4. Verify fallback works for large payloads
  - **Expected**: Large multicalls handled or fail gracefully
  - **Priority**: HIGH (mentioned in issue context)

- [ ] **TC-5.2.2**: Test rapid sequential multicalls
  - **Steps**:
    1. Fire 10 multicalls in quick succession
    2. Monitor RPC switching behavior
    3. Verify no race conditions in fallback switcher
  - **Expected**: All multicalls complete, correct fallback logic
  - **Priority**: MEDIUM

- [ ] **TC-5.2.3**: Test concurrent multicalls
  - **Steps**:
    1. Fire 5 multicalls simultaneously
    2. Monitor for conflicts
    3. Verify fallback switcher handles concurrent errors
  - **Expected**: All multicalls handled correctly
  - **Priority**: MEDIUM

---

### 6. Metrics & Observability

#### 6.1 Metric Events
**Objective**: Verify metrics are emitted correctly

- [ ] **TC-6.1.1**: Verify RPC ranking metrics
  - **Steps**:
    1. Monitor for `rpcTracker.ranking.setBestRpc` events
    2. Verify includes: chainId, rpcProvider, bestBlockGap, isLargeAccount
    3. Verify emitted when primary RPC changes
  - **Expected**: Correct metrics emitted on RPC change
  - **Test Type**: Integration

- [ ] **TC-6.1.2**: Verify multicall request metrics
  - **Steps**:
    1. Monitor for `multicall.request.call` events
    2. Verify includes: chainId, requestType (initial/retry), rpcProvider
    3. Check both initial and retry requests are tracked
  - **Expected**: All requests tracked with correct metadata
  - **Test Type**: Integration

- [ ] **TC-6.1.3**: Verify multicall error metrics
  - **Steps**:
    1. Trigger multicall errors
    2. Monitor for `multicall.error` events
    3. Verify includes: requestType, rpcProvider, errorMessage
  - **Expected**: Errors tracked with details
  - **Test Type**: Integration

- [ ] **TC-6.1.4**: Verify fallback mode metrics
  - **Steps**:
    1. Trigger fallback mode
    2. Check for `multicall.fallbackRpcMode.on` event
    3. Wait for restore
    4. Check for `multicall.fallbackRpcMode.off` event
  - **Expected**: Mode transitions tracked
  - **Test Type**: Integration

- [ ] **TC-6.1.5**: Verify timing metrics
  - **Steps**:
    1. Execute multicalls
    2. Monitor for `multicall.request.timing` events
    3. Verify includes: time, chainId, requestType, rpcProvider
  - **Expected**: Response times tracked
  - **Test Type**: Integration

---

### 7. Edge Cases & Error Recovery

#### 7.1 Edge Cases
**Objective**: Test unusual scenarios

- [ ] **TC-7.1.1**: Test all RPCs failing during probe
  - **Steps**:
    1. Mock all RPCs to fail during probe
    2. Verify fallback RPC is used for both primary and secondary
    3. Check no-success-probes error is handled
  - **Expected**: Falls back to getFallbackRpcUrl()
  - **Test Type**: Integration

- [ ] **TC-7.1.2**: Test RPC returning invalid data
  - **Steps**:
    1. Mock RPC returning invalid/malformed JSON
    2. Verify error is caught
    3. Verify fallback is triggered
  - **Expected**: Graceful error handling
  - **Test Type**: Integration

- [ ] **TC-7.1.3**: Test RPC with intermittent failures
  - **Steps**:
    1. Mock RPC that fails 50% of the time
    2. Monitor fallback switching behavior
    3. Verify doesn't switch too aggressively
  - **Expected**: Stable behavior, not flapping
  - **Priority**: MEDIUM

- [ ] **TC-7.1.4**: Test localStorage corruption
  - **Steps**:
    1. Corrupt RPC data in localStorage
    2. Reload application
    3. Verify falls back to default RPC selection
  - **Expected**: Graceful handling of bad localStorage data
  - **Test Type**: E2E

#### 7.2 Recovery Testing
**Objective**: Verify system recovers from failures

- [ ] **TC-7.2.1**: Test recovery after temporary RPC outage
  - **Steps**:
    1. Primary RPC fails, switch to secondary
    2. Wait 5 minutes for restore
    3. Verify primary RPC is re-probed and used if healthy
  - **Expected**: System recovers to primary RPC
  - **Test Type**: Integration

- [ ] **TC-7.2.2**: Test recovery with RPC replacement
  - **Steps**:
    1. Both RPCs fail
    2. Next probe cycle selects different RPCs
    3. Verify new RPCs are used
  - **Expected**: Bad RPCs are replaced in next cycle
  - **Priority**: HIGH (addresses core issue)

---

### 8. User Experience

#### 8.1 Loading States
**Objective**: Verify proper loading indicators

- [ ] **TC-8.1.1**: Verify loading indicators during RPC issues
  - **Steps**:
    1. Trigger slow RPC response
    2. Verify loading spinner is shown
    3. Verify user is not blocked from other actions
  - **Expected**: Clear loading feedback
  - **Test Type**: E2E

- [ ] **TC-8.1.2**: Verify error messages on complete failure
  - **Steps**:
    1. Both RPCs fail
    2. Verify user sees clear error message
    3. Verify error message suggests retry or alternative
  - **Expected**: Helpful error messaging
  - **Test Type**: E2E

#### 8.2 Console Debugging
**Objective**: Verify debug mode is helpful

- [ ] **TC-8.2.1**: Verify debug mode RPC table
  - **Steps**:
    1. Enable debug mode (isDebugMode())
    2. Wait for RPC probe cycle
    3. Verify console.table shows RPC comparison
    4. Check table includes: url, isPrimary, isValid, responseTime, blockNumber, isPublic
  - **Expected**: Clear debug information
  - **Test Type**: Manual

- [ ] **TC-8.2.2**: Verify multicall error logging
  - **Steps**:
    1. Trigger multicall error
    2. Check console for grouped error logs
    3. Verify error details are logged
  - **Expected**: Errors are clearly logged
  - **Test Type**: Manual

---

## Test Priorities

### Priority 1 (Must Test)
- TC-3.1.3: HTTP 503 handling (specific issue)
- TC-3.1.4: CORS error handling (specific issue for 1RPC)
- TC-3.2.1: Secondary RPC timeout (simultaneous failure)
- TC-3.2.3: No infinite retry loop
- TC-4.1.1: DRPC stability/fallback
- TC-5.1.1: 3G connection performance
- TC-5.1.2: 4G connection performance
- TC-5.2.1: Large multicall chunks
- TC-7.2.2: RPC replacement after failures

### Priority 2 (Should Test)
- All TC-1.x: RPC selection tests
- TC-2.1.x: Fallback switcher logic
- TC-3.1.1-2, 3.1.5: Other error types
- TC-4.1.3: Alchemy stability
- TC-6.x: Metrics (for observability)

### Priority 3 (Nice to Test)
- TC-4.1.4: All RPC providers audit
- TC-5.2.2-3: High load scenarios
- TC-7.1.x: Edge cases
- TC-8.x: UX tests

---

## Test Environments

### Chains to Test
1. **Arbitrum** (Primary - most users)
2. **Avalanche** (Secondary - significant users)
3. **Botanix** (New - ensure parity)
4. **Arbitrum Sepolia** (Testnet - safe testing ground)

### Network Conditions
1. **Normal**: Broadband (10+ Mbps)
2. **Slow 4G**: 4 Mbps, 500ms latency
3. **Fast 3G**: 1.5 Mbps, 750ms latency
4. **Slow 3G**: 500 Kbps, 2000ms latency

### Account Types
1. **Regular Account**: Uses public RPCs + Alchemy fallback
2. **Large Account**: Uses private/Alchemy RPCs + public fallback

---

## Test Data & Tools

### Tools Required
- Chrome DevTools (Network throttling)
- Console access (for debug mode)
- Mock RPC server (for simulating failures)
- Metrics dashboard (for observing events)

### Test Accounts
- Regular account (any address)
- Large account (high volume trader) - need to identify criteria in `isLargeAccount()`

### Mock Scenarios
1. RPC returning 503
2. RPC with CORS errors
3. RPC with timeouts
4. RPC with invalid data
5. RPC with future block numbers
6. RPC with lagging block numbers

---

## Success Criteria

The RPC fallback improvements are successful if:

1. ✅ **No infinite loading loops** on slow connections (3G/4G)
2. ✅ **503 errors are handled** without user-visible failures
3. ✅ **CORS errors are handled** gracefully
4. ✅ **Simultaneous failures** of primary and secondary RPCs are detected and recovered
5. ✅ **RPC replacement** occurs automatically when both fail
6. ✅ **Large multicalls** don't break the system
7. ✅ **Metrics provide visibility** into RPC health and failures
8. ✅ **Performance is acceptable** on slow networks (load within 30s on 3G)
9. ✅ **No regression** in functionality for users with good connections
10. ✅ **Debug mode** provides useful information for troubleshooting

---

## Testing Notes

### Known Issues to Verify Fixed
From the screenshots and context:
1. User on 3G/4G getting stuck in loading loop
2. DRPC selected as primary but returning 503 in actual usage
3. 1RPC always CORS back
4. No mechanism to replace RPCs when both fail simultaneously
5. BestRpcTracker probe doesn't catch issues with large multicall chunks

### Out of Scope
- Changes to smart contract logic
- Wallet connection issues
- UI/UX redesign (only error messaging improvements)
- Adding new RPC providers (testing existing ones)

---

## Regression Testing Checklist

Before release, verify these core functions still work:

- [ ] Trading (create increase order)
- [ ] Trading (create decrease order)
- [ ] Trading (create swap order)
- [ ] View positions
- [ ] View markets
- [ ] View orders
- [ ] Claim rewards
- [ ] Connect/disconnect wallet
- [ ] Switch chains

All on both:
- [ ] Regular accounts
- [ ] Large accounts

---

## Appendix

### Key Code Files
- `/src/lib/rpc/bestRpcTracker.ts` - RPC selection and probing
- `/src/lib/multicall/Multicall.ts` - Multicall execution and fallback
- `/src/lib/slidingWindowFallbackSwitcher.ts` - Fallback switching logic
- `/src/config/chains.ts` - RPC provider configuration

### Related PRs
- [#2029 RPC Fallbacks Improvements](https://github.com/gmx-io/gmx-interface/pull/2029/files)

### References
- Issue: GMX-118
- Screenshots: Attached in Linear issue
