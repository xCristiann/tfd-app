-- Update ALL firms with Google favicon URLs (reliable fallback)
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=ftmo.com&sz=128' where slug = 'ftmo';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=the5ers.com&sz=128' where slug = 'the5ers';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=fundednext.com&sz=128' where slug = 'fundednext';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=fundingpips.com&sz=128' where slug = 'fundingpips';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=alphacapitalgroup.uk&sz=128' where slug = 'alpha-capital-group';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=topstep.com&sz=128' where slug = 'topstep';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=fxify.com&sz=128' where slug = 'fxify';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=apextraderfunding.com&sz=128' where slug = 'apex-trader-funding';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=e8markets.com&sz=128' where slug = 'e8-markets';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=maventrading.com&sz=128' where slug = 'maven-trading';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=smartproptrader.com&sz=128' where slug = 'smart-prop-trader';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=goatfundedtrader.com&sz=128' where slug = 'goat-funded-trader';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=fundedtradingplus.com&sz=128' where slug = 'funded-trading-plus';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=holaprime.com&sz=128' where slug = 'hola-prime';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=blueberryfunded.com&sz=128' where slug = 'blueberry-funded';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=dnafunded.com&sz=128' where slug = 'dna-funded';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=myfundedfutures.com&sz=128' where slug = 'my-funded-futures';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=citytradersi.com&sz=128' where slug = 'city-traders-imperium';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=brightfunded.com&sz=128' where slug = 'brightfunded';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=fortraders.com&sz=128' where slug = 'for-traders';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=audacitycapital.co.uk&sz=128' where slug = 'audacity-capital';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=monetafunded.com&sz=128' where slug = 'moneta-funded';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=fundedengineer.com&sz=128' where slug = 'funded-engineer';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=thetradingpit.com&sz=128' where slug = 'the-trading-pit';
update public.firms set logo_url = 'https://www.google.com/s2/favicons?domain=traderswithededge.com&sz=128' where slug = 'traders-with-edge';

-- Verify all have logos
select slug, logo_url is not null as has_logo from public.firms where is_published = true order by slug;