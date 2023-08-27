import { decodeLightnightPayRequest } from "..";

test("decodeLightningPayRequest", () => {
  const req =
    "lnbc10n1pjvmrrnpp5yydgk0802tlfukay0kr5alcy4dk6wukzwd9dss22m0xgvgf7szcqhp5rt66kqtmtcd0ruush32mpv9dlglqk07l3ncdssmwl05akmfl9gnqcqzzsxqzfvsp53saq4hkt8r05pes47fw838xuy0fs62xshuqrdx2z98th25cdrzns9qyyssqvrmgjzxkevx5dc6cgh9vkukt6jp7zwq6fepqun4z7z5xkwxd069rl768nm658vy6kdvp0qrjkhvf3swch7ycmfn9jgqjwm75cccalkqq50fkyj";
  const decoded = decodeLightnightPayRequest(req);
  expect(decoded).toEqual({
    paymentRequest:
      "lnbc10n1pjvmrrnpp5yydgk0802tlfukay0kr5alcy4dk6wukzwd9dss22m0xgvgf7szcqhp5rt66kqtmtcd0ruush32mpv9dlglqk07l3ncdssmwl05akmfl9gnqcqzzsxqzfvsp53saq4hkt8r05pes47fw838xuy0fs62xshuqrdx2z98th25cdrzns9qyyssqvrmgjzxkevx5dc6cgh9vkukt6jp7zwq6fepqun4z7z5xkwxd069rl768nm658vy6kdvp0qrjkhvf3swch7ycmfn9jgqjwm75cccalkqq50fkyj",
    sections: [
      { name: "lightning_network", letters: "ln" },
      {
        name: "coin_network",
        letters: "bc",
        value: {
          bech32: "bc",
          pubKeyHash: 0,
          scriptHash: 5,
          validWitnessVersions: [0],
        },
      },
      { name: "amount", letters: "10n", value: "1000" },
      { name: "separator", letters: "1" },
      { name: "timestamp", letters: "pjvmrrn", value: 1691192435 },
      {
        name: "payment_hash",
        tag: "p",
        letters: "pp5yydgk0802tlfukay0kr5alcy4dk6wukzwd9dss22m0xgvgf7szcq",
        value:
          "211a8b3cef52fe9e5ba47d874eff04ab6da772c2734ad8414adbcc86213e80b0",
      },
      {
        name: "description_hash",
        tag: "h",
        letters: "hp5rt66kqtmtcd0ruush32mpv9dlglqk07l3ncdssmwl05akmfl9gnq",
        value:
          "1af5ab017b5e1af1f390bc55b0b0adfa3e0b3fdf8cf0d8436efbe9db6d3f2a26",
      },
      { name: "min_final_cltv_expiry", tag: "c", letters: "cqzzs", value: 80 },
      { name: "expiry", tag: "x", letters: "xqzfv", value: 300 },
      {
        name: "payment_secret",
        tag: "s",
        letters: "sp53saq4hkt8r05pes47fw838xuy0fs62xshuqrdx2z98th25cdrzns",
        value:
          "8c3a0adecb38df40e615f25c789cdc23d30d28d0bf0036994229d775530d18a7",
      },
      {
        name: "feature_bits",
        tag: "9",
        letters: "9qyyssq",
        value: {
          option_data_loss_protect: "unsupported",
          initial_routing_sync: "unsupported",
          option_upfront_shutdown_script: "unsupported",
          gossip_queries: "unsupported",
          var_onion_optin: "supported",
          gossip_queries_ex: "unsupported",
          option_static_remotekey: "unsupported",
          payment_secret: "required",
          basic_mpp: "supported",
          option_support_large_channel: "unsupported",
          extra_bits: { start_bit: 20, bits: [], has_required: false },
        },
      },
      {
        name: "signature",
        letters:
          "vrmgjzxkevx5dc6cgh9vkukt6jp7zwq6fepqun4z7z5xkwxd069rl768nm658vy6kdvp0qrjkhvf3swch7ycmfn9jgqjwm75cccalkqq",
        value:
          "60f68908d6cb0d46e35845cacb72cbd483e1381a4e420e4ea2f0a86b38cd7e8a3ffb479ef543b09ab358178072b5d898c1d8bf898da6659201276fd4c631dfd800",
      },
      { name: "checksum", letters: "50fkyj" },
    ],
    expiry: 300,
    route_hints: [],
  });
});
