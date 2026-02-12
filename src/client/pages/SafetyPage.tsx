export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Staying Safe When Buying Tickets Online
        </h1>
        <p className="text-gray-600 mb-8">
          Houston Events links to third-party websites for ticket purchases and event details.
          We cannot guarantee the safety of external sites. Use these tips to protect yourself.
        </p>

        {/* Immediate Steps if Scammed */}
        <section className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-red-800 mb-4">
            Already Been Scammed? Take These Steps Now
          </h2>
          <ol className="space-y-3 text-red-900">
            <li className="flex gap-3">
              <span className="font-bold text-red-600 shrink-0">1.</span>
              <div>
                <strong>Contact your bank or credit card company immediately.</strong> Request a chargeback
                for the fraudulent transaction. Credit cards offer stronger buyer protection than debit cards.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-red-600 shrink-0">2.</span>
              <div>
                <strong>File a complaint with the FTC</strong> at{' '}
                <a href="https://reportfraud.ftc.gov" target="_blank" rel="noopener noreferrer"
                   className="text-red-700 underline font-medium">
                  reportfraud.ftc.gov
                </a>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-red-600 shrink-0">3.</span>
              <div>
                <strong>Report to the Texas Attorney General</strong> at{' '}
                <a href="https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint"
                   target="_blank" rel="noopener noreferrer"
                   className="text-red-700 underline font-medium">
                  texasattorneygeneral.gov
                </a>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-red-600 shrink-0">4.</span>
              <div>
                <strong>Report the scam website</strong> to{' '}
                <a href="https://www.ic3.gov" target="_blank" rel="noopener noreferrer"
                   className="text-red-700 underline font-medium">
                  FBI's Internet Crime Complaint Center (IC3)
                </a>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-red-600 shrink-0">5.</span>
              <div>
                <strong>Document everything.</strong> Save screenshots of the website, confirmation emails,
                transaction records, and any communication with the seller.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-red-600 shrink-0">6.</span>
              <div>
                <strong>Change your passwords</strong> if you created an account on the scam site,
                especially if you reused the same password elsewhere.
              </div>
            </li>
          </ol>
        </section>

        {/* How to Spot a Scam */}
        <section className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            How to Spot a Ticket Scam
          </h2>
          <div className="space-y-4">
            <div className="border-l-4 border-yellow-400 pl-4">
              <h3 className="font-semibold text-gray-900">Prices that seem too good (or too high)</h3>
              <p className="text-gray-600 text-sm mt-1">
                If tickets are dramatically cheaper or more expensive than the venue's official price,
                it's a red flag. Scammers often charge hidden "service fees" that inflate the total far
                beyond face value.
              </p>
            </div>
            <div className="border-l-4 border-yellow-400 pl-4">
              <h3 className="font-semibold text-gray-900">Lookalike websites</h3>
              <p className="text-gray-600 text-sm mt-1">
                Scammers create sites that look like Ticketmaster, StubHub, or venue websites.
                Always check the URL bar carefully. The real Ticketmaster is ticketmaster.com, not
                ticketmaster-official.com or ticketmasterdeals.net.
              </p>
            </div>
            <div className="border-l-4 border-yellow-400 pl-4">
              <h3 className="font-semibold text-gray-900">Pressure to buy immediately</h3>
              <p className="text-gray-600 text-sm mt-1">
                "Only 2 left!" or "This deal expires in 5 minutes!" are common scam tactics.
                Legitimate sellers don't pressure you with artificial urgency.
              </p>
            </div>
            <div className="border-l-4 border-yellow-400 pl-4">
              <h3 className="font-semibold text-gray-900">Unusual payment methods</h3>
              <p className="text-gray-600 text-sm mt-1">
                Be wary of sites that only accept wire transfers, gift cards, cryptocurrency, or
                peer-to-peer payment apps like Venmo/Zelle. Legitimate ticket sellers accept credit cards.
              </p>
            </div>
            <div className="border-l-4 border-yellow-400 pl-4">
              <h3 className="font-semibold text-gray-900">No refund or guarantee policy</h3>
              <p className="text-gray-600 text-sm mt-1">
                Reputable ticket platforms have clear refund policies and buyer guarantees.
                If a site has no policy or makes it hard to find, avoid it.
              </p>
            </div>
            <div className="border-l-4 border-yellow-400 pl-4">
              <h3 className="font-semibold text-gray-900">Sponsored search results</h3>
              <p className="text-gray-600 text-sm mt-1">
                Scam sites often pay for top positions in search results. The first result for
                "buy [event] tickets" may not be the official source. Scroll past ads and look for
                the venue's actual website.
              </p>
            </div>
          </div>
        </section>

        {/* Safe Buying Practices */}
        <section className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Safe Ticket Buying Practices
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">Do</h3>
              <ul className="space-y-2 text-sm text-green-900">
                <li>- Buy directly from the venue's official website</li>
                <li>- Use authorized resellers (Ticketmaster, StubHub, SeatGeek)</li>
                <li>- Pay with a credit card for chargeback protection</li>
                <li>- Compare prices across multiple legitimate sites</li>
                <li>- Check the total price including all fees before paying</li>
                <li>- Read reviews of the seller before purchasing</li>
                <li>- Verify the URL matches the real website exactly</li>
                <li>- Look for HTTPS (lock icon) in the address bar</li>
              </ul>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">Don't</h3>
              <ul className="space-y-2 text-sm text-red-900">
                <li>- Click on social media ads for ticket deals</li>
                <li>- Buy from unfamiliar websites without researching them</li>
                <li>- Pay via wire transfer, gift cards, or cryptocurrency</li>
                <li>- Share personal information beyond what's needed</li>
                <li>- Trust screenshots of tickets as proof of legitimacy</li>
                <li>- Ignore your browser's security warnings</li>
                <li>- Rush into purchases under time pressure</li>
                <li>- Use the same password on ticket sites as your email/bank</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Trusted Platforms */}
        <section className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Authorized Ticket Platforms
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            These are well-known, established ticket platforms with buyer protection policies.
            Always go directly to their websites rather than through links from unknown sources.
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            {[
              { name: 'Ticketmaster', domain: 'ticketmaster.com' },
              { name: 'Eventbrite', domain: 'eventbrite.com' },
              { name: 'StubHub', domain: 'stubhub.com' },
              { name: 'SeatGeek', domain: 'seatgeek.com' },
              { name: 'AXS', domain: 'axs.com' },
              { name: 'Vivid Seats', domain: 'vividseats.com' },
            ].map((platform) => (
              <div key={platform.domain} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-green-600 font-bold">✓</span>
                <div>
                  <span className="font-medium text-gray-900 text-sm">{platform.name}</span>
                  <span className="text-gray-500 text-xs block">{platform.domain}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* About Our Safety Features */}
        <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-indigo-900 mb-4">
            How Houston Events Protects You
          </h2>
          <ul className="space-y-3 text-indigo-900 text-sm">
            <li className="flex gap-3">
              <span className="text-indigo-600 font-bold shrink-0">-</span>
              <span>
                <strong>Link safety warnings</strong> - We show an interstitial screen before you
                leave our site, with information about the destination website.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-600 font-bold shrink-0">-</span>
              <span>
                <strong>Trusted site identification</strong> - We flag links that go to recognized
                event platforms so you can have more confidence in those destinations.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-600 font-bold shrink-0">-</span>
              <span>
                <strong>Suspicious URL detection</strong> - We analyze URLs for patterns commonly
                used by scam and phishing sites and warn you before you visit them.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-indigo-600 font-bold shrink-0">-</span>
              <span>
                <strong>Disclaimer</strong> - Houston Events aggregates event data from third-party
                sources. We do not sell tickets and are not responsible for transactions on
                external websites. Always verify the legitimacy of a site before making a purchase.
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
