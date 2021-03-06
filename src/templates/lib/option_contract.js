export default `{
	messages: {
		cases: [
			{ // define YES and NO assets
				if: \`{
					$define_yes = trigger.data.define_yes AND !var['yes_asset'];
					$define_no = trigger.data.define_no AND !var['no_asset'];
					if ($define_yes AND $define_no)
						bounce("can't define both assets at the same time");
					$define_yes OR $define_no
				}\`,
				messages: [
					{
						app: 'asset',
						payload: {
							// without cap
							is_private: false,
							is_transferrable: true,
							auto_destroy: false,
							fixed_denominations: false,
							issued_by_definer_only: true,
							cosigned_by_definer: false,
							spender_attested: false,
						}
					},
					{
						app: 'state',
						state: \`{
							$asset = $define_yes ? 'yes_asset' : 'no_asset';
							var[$asset] = response_unit;
							response[$asset] = response_unit;
						}\`
					}
				]
			},
			{ // issue YES and NO assets in exchange for bytes
				if: "{trigger.output[[asset=base]] >= 1e5 AND var['yes_asset'] AND var['no_asset']}",
				messages: [
					{
						app: 'payment',
						payload: {
							asset: "{var['yes_asset']}",
							outputs: [
								{address: "{trigger.address}", amount: "{ trigger.output[[asset=base]] }"}
							]
						}
					},
					{
						app: 'payment',
						payload: {
							asset: "{var['no_asset']}",
							outputs: [
								{address: "{trigger.address}", amount: "{ trigger.output[[asset=base]] }"}
							]
						}
					},
				]
			},
			{ // record the outcome
				if: \`{(trigger.data.winner == 'yes' OR trigger.data.winner == 'no') AND !var['winner']}\`,
				messages: [{
					app: 'state',
					state: \`{
						if (trigger.data.winner == 'yes' AND data_feed[[oracles='X55IWSNMHNDUIYKICDW3EOYAWHRUKANP', feed_name='GBYTE_USD']] > 60)
							var['winner'] = 'yes';
						else if (trigger.data.winner == 'no' AND timestamp > 1556668800)
							var['winner'] = 'no';
						else
							bounce('suggested outcome not confirmed');
						response['winner'] = trigger.data.winner;
					}\`
				}]
			},
			{ // pay bytes in exchange for the winning asset
				if: "{trigger.output[[asset!=base]] > 1000 AND var['winner'] AND trigger.output[[asset!=base]].asset == var[var['winner'] || '_asset']}",
				messages: [{
					app: 'payment',
					payload: {
						asset: "base",
						outputs: [
							{address: "{trigger.address}", amount: "{ trigger.output[[asset!=base]] }"}
						]
					}
				}]
			},
		]
	}
}`
