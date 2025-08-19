import { Redirect, useLocation } from "react-router-dom";

type Props = {
  to: string;
  from?: string;
  exact?: boolean;
};

export function RedirectWithQuery({ to, exact, from }: Props) {
  const { search: reactSearch } = useLocation();

  const queryParams = reactSearch || window.location.search;

  return <Redirect exact={exact} from={from} to={`${to}${queryParams}`} />;
}
