import { MdArrowForwardIos, MdClose } from "react-icons/md";

const BoostTips = () => {
  // This component is a simple informational box that suggests activating the One-Click Trading feature.
  return (
    <div className="bg-[#131313] p-10 rounded-8 mb-10 relative">
      <p className="title flex">
        <span>Boost your trading</span>
      </p>
      <p className="content text-[#A3A3A3] my-4 mr-12">
        For an enhanced trading experience, we recommend activating the One-Click Trading feature
      </p>
      <p className="tools text-[#FA7B4E] text-[12px] flex items-center cursor-pointer">
        Activate 1CT <MdArrowForwardIos className="ml-4" />
      </p>
      <div className="close-btn absolute right-10 top-10 cursor-pointer">
        <MdClose fontSize={22} className="Modal-close-icon" />
      </div>
    </div>
  )
}

export default BoostTips;
