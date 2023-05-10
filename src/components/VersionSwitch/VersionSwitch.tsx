import { NavLink } from "react-router-dom";
import "./VersionSwitch.scss";

export function VersionSwitch() {
  return (
    <div className="VersionSwitch">
      <NavLink className="VersionSwitch-option" activeClassName="active" exact to="/trade">
        V1
      </NavLink>
      <NavLink className="VersionSwitch-option" activeClassName="active" exact to="/v2">
        V2
      </NavLink>
    </div>
  );
}
