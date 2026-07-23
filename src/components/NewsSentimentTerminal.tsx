"use client";
import React, { useState, useEffect } from 'react';

export default function NewsSentimentTerminal() {
  const [sentiment, setSentiment] = useState<{ score: number; label: string; lastUpdated: string } | null>(null);
  const [headlines, setHeadlines] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchSentimentData = async () => {
      try {
        const senRes = await fetch('/api/sentiment/latest/BTCUSDT');
        const senData = await senRes.json();
        setSentiment(senData.aggregate);
        setHeadlines(senData.headlines);

        const calRes = await fetch('/api/sentiment/macro-calendar');
        const calData = await calRes.json();
        setEvents(calData.events);
      } catch (err) {
        if (err instanceof TypeError) { console.warn("Sentiment API offline (Server restarting)"); } else { console.error("Failed to fetch sentiment data", err); }
      }
    };

    fetchSentimentData();
    const interval = setInterval(fetchSentimentData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getSentimentColor = (score: number) => {
    if (score >= 0.5) return "text-[#00E676]";
    if (score <= -0.5) return "text-[#FF1744]";
    return "text-[#838C9C]";
  };

  const getImpactColor = (impact: string) => {
    if (impact === "HIGH" || impact === "CRITICAL") return "text-[#FFD600] border-[#FFD600]";
    if (impact === "MEDIUM") return "text-orange-400 border-orange-400";
    return "text-[#838C9C] border-[#838C9C]";
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto font-mono text-[#E6E9EF]">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Aggregate Sentiment Gauge */}
        <div className="bg-[#0B0C10] p-6 rounded-lg border-4 border-[#1F2833] shadow-2xl col-span-1 flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-6 self-start w-full border-b-2 border-[#1F2833] pb-2">Market Bias</h2>
          
          <div className="relative w-48 h-48 flex items-center justify-center">
             <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1F2833" strokeWidth="8" />
                {sentiment && (
                  <circle 
                    cx="50" cy="50" r="40" fill="transparent" 
                    stroke={sentiment.score >= 0 ? "#00E676" : "#FF1744"} 
                    strokeWidth="8" 
                    strokeDasharray={`${Math.abs(sentiment.score) * 251.2} 251.2`}
                  />
                )}
             </svg>
             <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${sentiment ? getSentimentColor(sentiment.score) : "text-[#838C9C]"}`}>
                  {sentiment ? (sentiment.score > 0 ? '+' : '') + sentiment.score.toFixed(2) : "0.00"}
                </span>
                <span className="text-sm font-semibold uppercase text-[#838C9C] mt-2">
                  {sentiment ? sentiment.label : "NEUTRAL"}
                </span>
             </div>
          </div>
          <p className="text-xs text-[#838C9C] mt-4 uppercase">Dynamic NLP Confluence: 30%</p>
        </div>

        {/* Live Headlines Feed */}
        <div className="bg-[#0B0C10] p-6 rounded-lg border-4 border-[#1F2833] shadow-2xl col-span-2 flex flex-col">
          <h2 className="text-xl font-bold text-white tracking-widest uppercase border-b-2 border-[#1F2833] pb-2 mb-4 flex items-center justify-between">
            <span>News Stream</span>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse"></div>
                <span className="text-xs text-[#00E676]">LIVE</span>
            </div>
          </h2>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 h-[250px]">
            {headlines.map((item, idx) => (
              <div key={idx} className="bg-[#12161D] p-3 rounded border border-[#232833] hover:border-[#3DDBD9] transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#66FCF1]">{item.source} • {new Date(item.published_at).toLocaleTimeString()}</span>
                  <div className="flex gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${getImpactColor(item.impact)}`}>{item.impact}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                        item.sentiment_score > 0 ? "text-[#00E676] border-[#00E676]" : item.sentiment_score < 0 ? "text-[#FF1744] border-[#FF1744]" : "text-[#838C9C] border-[#838C9C]"
                    }`}>
                      {item.sentiment_score > 0 ? 'BULL' : item.sentiment_score < 0 ? 'BEAR' : 'NEUT'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[#E6E9EF] group-hover:text-white transition-colors leading-relaxed">
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Economic Calendar Ticker */}
      <div className="bg-[#0B0C10] p-4 rounded-lg border-4 border-[#1F2833] shadow-2xl flex flex-col overflow-hidden">
        <h2 className="text-lg font-bold text-white tracking-widest uppercase mb-4 flex gap-2 items-center">
            Macro Calendar Events
        </h2>
        
        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
          {events.map((ev, idx) => {
            const isHighImpact = ev.impact === "HIGH";
            return (
              <div key={idx} className="flex-shrink-0 w-64 bg-[#12161D] p-3 rounded border border-[#232833] relative">
                {isHighImpact && <div className="absolute top-0 left-0 w-full h-1 bg-[#FFD600] rounded-t" />}
                <div className="flex justify-between items-start mb-2 mt-1">
                  <span className="text-xs font-bold text-[#838C9C] uppercase">{ev.country}</span>
                  <span className="text-xs text-[#E6E9EF]">{new Date(ev.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-2 whitespace-nowrap overflow-hidden text-ellipsis" title={ev.event}>{ev.event}</h3>
                <div className="flex justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="text-[#838C9C]">Actual</span>
                    <span className="text-white font-bold">{ev.actual || "---"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#838C9C]">Forecast</span>
                    <span className="text-white">{ev.forecast || "---"}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#838C9C]">Prev</span>
                    <span className="text-[#838C9C]">{ev.previous}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
