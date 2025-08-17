/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, type RefObject } from 'react'
import { GameGuide } from './Components/GameGuideNode'
import { OrderNode } from './Components/OrderNode'
import { TimeNode } from './Components/TimeNode'
import { MarketNode } from './Components/MarketNode'
import { PortfolioNode } from './Components/PortfolioNode'
import { EventsNode } from './Components/EventsNode'
import { GameEndedNode } from './Components/GameEndedNode'
import type { MarketNodeHandles } from './Interfaces/MarketStockInterface'
import type { PortfolioStockHandles } from './Interfaces/PortfolioStockInterface'
import type { EventNodeHandles } from './Interfaces/AnnounceEventInterface'
import { EventEngine } from './Utilities/MarketEventEngine'
import { MarketPriceEngine } from './Utilities/MarketPriceUtils'
import { DerivativesNode } from './Components/DerivativesNode'
import type { DerivativeNodeHandles } from './Interfaces/MarketDerivativeInterface'
import type { GameEndedHandles } from './Components/GameEndedNode'
import { GradientBlobs } from './Components/DesignComponents/GradientBlobs'
import './App.css'

function App() {
  // Track market, portfolio, and event chat so they can communicate with each other!
  const marketRef = useRef<MarketNodeHandles>(null);
  const portfolioRef = useRef<PortfolioStockHandles>(null);
  const derivativesRef = useRef<DerivativeNodeHandles>(null);
  const eventChatRef = useRef<EventNodeHandles>(null);
  const gameManagerRef = useRef<GameEndedHandles>(null);

  const eventEngine = new EventEngine();
  const marketPriceEngine = new MarketPriceEngine();

  useEffect(() => {
    eventEngine.attachEventChat(eventChatRef.current as EventNodeHandles);
    eventEngine.attachMarket(marketRef.current as MarketNodeHandles);

    marketPriceEngine.attachEventEngine(eventEngine);
    marketPriceEngine.attachMarket(marketRef.current as MarketNodeHandles)
  }, [])

  return (
    <>  
      <GradientBlobs></GradientBlobs>
      <GameGuide></GameGuide>
      <div className='main-app-container'>
        <div className='main-app-left-sidebar'>
          {/* <TimeNode marketRef={marketRef as React.RefObject<MarketNodeHandles>} eventEngine={eventEngine} derivativesRef={derivativesRef as React.RefObject<DerivativeNodeHandles>} onTimeLimitExceeded={() => gameManagerRef?.current?.endGame()}></TimeNode> */}
          <TimeNode 
            onMinutePassed={[() => {marketPriceEngine.fluctuateMarketPricesByMinute()}]} 
            onHourPassed={[]} 
            onDayPassed={[() => marketPriceEngine.fluctuateMarketPricesByDays(1), () => eventEngine.passDay(), () => derivativesRef.current?.passDay()]} 
            onTimeSkip={[(daysPassed: number) => marketPriceEngine.fluctuateMarketPricesByDays(daysPassed), (daysPassed: number) => eventEngine.passDays(daysPassed), (daysPassed: number) => derivativesRef.current?.passDays(daysPassed)]}
            onTimeLimitExceeded={() => gameManagerRef?.current?.endGame()}>
          </TimeNode>
          
          <OrderNode marketRef={marketRef as React.RefObject<MarketNodeHandles>} portfolioRef={portfolioRef as React.RefObject<PortfolioStockHandles>} derivativesRef={derivativesRef as React.RefObject<DerivativeNodeHandles>} eventChat={eventChatRef as RefObject<EventNodeHandles>}></OrderNode>
          <EventsNode ref={eventChatRef}></EventsNode>
        </div>
        <div className='main-app-middle-container'>
          <DerivativesNode ref={derivativesRef} marketRef={marketRef as React.RefObject<MarketNodeHandles>} portfolioRef={portfolioRef as React.RefObject<PortfolioStockHandles>} eventChat={eventChatRef as RefObject<EventNodeHandles>}></DerivativesNode>
          <MarketNode ref={marketRef} portfolioRef={portfolioRef as React.RefObject<PortfolioStockHandles>} eventEngine={eventEngine}></MarketNode>
        </div>
        <div className='main-app-right-sidebar'>
          <PortfolioNode ref={portfolioRef} marketRef={marketRef as React.RefObject<MarketNodeHandles>}></PortfolioNode>
        </div>
      </div>
      <GameEndedNode ref={gameManagerRef} portfolioRef={portfolioRef as React.RefObject<PortfolioStockHandles>}></GameEndedNode>
    </>
  )
}

export default App
