const PRIVY_PROD_APP_ID = "cmov9f3bn00ga0bkwnxy3k96v";
const PRIVY_LOCAL_DEV_APP_ID = "cmp46in9h014m0cl5uajtozex";

export const PRIVY_APP_ID = import.meta.env.DEV ? PRIVY_LOCAL_DEV_APP_ID : PRIVY_PROD_APP_ID;
