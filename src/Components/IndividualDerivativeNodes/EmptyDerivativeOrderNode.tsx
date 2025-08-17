interface EmptyDerivativeListingNodeProps {
    title: string;
    description: string;
}

const EmptyDerivativeListingNode = ({ title, description }: EmptyDerivativeListingNodeProps) => {
    return (
        <>
            <div className={`derivative-order-container`} key={Math.random()}>
                <div className="derivative-order-stat-row">
                    <p className="derivative-order-stat-type">{title}</p>
                </div>
                <div className="derivative-order-stat-row">
                    <p className="derivative-order-stat-explanation">{description}</p>
                </div>
            </div>
        </>
    )
}

export {EmptyDerivativeListingNode}