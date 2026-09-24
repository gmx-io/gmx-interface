import './index.scss'

export default function DataPanel({
    dataList,
}: {
    dataList: {
        title: string | JSX.Element;
        tipPanel?: JSX.Element;
        content?: JSX.Element | string;
        isLine?: boolean;
    }[];
}) {
    return (
        <div className="data-panel">
            {dataList.map((item) => (
                <div className="data-panel-item" key={item.title}>
                    <div className="data-panel-item-title">
                        <span>{item.title}</span>
                        {item.tipPanel && <span>{item.tipPanel}</span>}
                    </div>
                    <div className="data-panel-item-content">
                        {item.content ? <span>{item.content}</span> : '-'}
                    </div>
                </div>
            ))}
        </div>
    )
}