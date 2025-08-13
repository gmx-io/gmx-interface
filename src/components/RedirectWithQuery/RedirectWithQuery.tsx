import { Redirect } from "react-router-dom";

type Props = {
  to: string;
  from?: string;
  exact?: boolean;
};

export function RedirectWithQuery({ to, exact, from }: Props) {
  return <Redirect exact={exact} from={from} to={`${to}${window.location.search}`} />;
}
