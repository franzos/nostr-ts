import { decodeLightnightPayRequest } from "../src";

/**
 * I used to use bolt11 library but due to problems in the browser I went with light-bolt11-decoder for now
 */

// test("decodeLightnightPayRequest", () => {
//   const req =
//     "lnbc20m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqsfpp3qjmp7lwpagxun9pygexvgpjdc4jdj85fr9yq20q82gphp2nflc7jtzrcazrra7wwgzxqc8u7754cdlpfrmccae92qgzqvzq2ps8pqqqqqqpqqqqq9qqqvpeuqafqxu92d8lr6fvg0r5gv0heeeqgcrqlnm6jhphu9y00rrhy4grqszsvpcgpy9qqqqqqgqqqqq7qqzqj9n4evl6mr5aj9f58zp6fyjzup6ywn3x6sk8akg5v4tgn2q8g4fhx05wf6juaxu9760yp46454gpg5mtzgerlzezqcqvjnhjh8z3g2qqdhhwkj";
//   const decoded = decodeLightnightPayRequest(req);
//   expect(decoded).toEqual({
//     complete: true,
//     millisatoshis: "2000000000",
//     network: {
//       bech32: "bc",
//       pubKeyHash: 0,
//       scriptHash: 5,
//       validWitnessVersions: [0, 1],
//     },
//     payeeNodeKey:
//       "03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad",
//     paymentRequest:
//       "lnbc20m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqsfpp3qjmp7lwpagxun9pygexvgpjdc4jdj85fr9yq20q82gphp2nflc7jtzrcazrra7wwgzxqc8u7754cdlpfrmccae92qgzqvzq2ps8pqqqqqqpqqqqq9qqqvpeuqafqxu92d8lr6fvg0r5gv0heeeqgcrqlnm6jhphu9y00rrhy4grqszsvpcgpy9qqqqqqgqqqqq7qqzqj9n4evl6mr5aj9f58zp6fyjzup6ywn3x6sk8akg5v4tgn2q8g4fhx05wf6juaxu9760yp46454gpg5mtzgerlzezqcqvjnhjh8z3g2qqdhhwkj",
//     prefix: "lnbc20m",
//     recoveryFlag: 0,
//     satoshis: 2000000,
//     signature:
//       "91675cb3fad8e9d915343883a49242e074474e26d42c7ed914655689a8074553733e8e4ea5ce9b85f69e40d755a55014536b12323f8b220600c94ef2b9c51428",
//     tags: [
//       {
//         tagName: "payment_hash",
//         data: "0001020304050607080900010203040506070809000102030405060708090102",
//       },
//       {
//         tagName: "purpose_commit_hash",
//         data: "3925b6f67e2c340036ed12093dd44e0368df1b6ea26c53dbe4811f58fd5db8c1",
//       },
//       {
//         tagName: "fallback_address",
//         data: {
//           code: 17,
//           address: "1RustyRX2oai4EYYDpQGWvEL62BBGqN9T",
//           addressHash: "04b61f7dc1ea0dc99424464cc4064dc564d91e89",
//         },
//       },
//       {
//         tagName: "routing_info",
//         data: [
//           {
//             pubkey:
//               "029e03a901b85534ff1e92c43c74431f7ce72046060fcf7a95c37e148f78c77255",
//             short_channel_id: "0102030405060708",
//             fee_base_msat: 1,
//             fee_proportional_millionths: 20,
//             cltv_expiry_delta: 3,
//           },
//           {
//             pubkey:
//               "039e03a901b85534ff1e92c43c74431f7ce72046060fcf7a95c37e148f78c77255",
//             short_channel_id: "030405060708090a",
//             fee_base_msat: 2,
//             fee_proportional_millionths: 30,
//             cltv_expiry_delta: 4,
//           },
//         ],
//       },
//     ],
//     timestamp: 1496314658,
//     timestampString: "2017-06-01T10:57:38.000Z",
//     wordsTemp:
//       "temp1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqsfpp3qjmp7lwpagxun9pygexvgpjdc4jdj85fr9yq20q82gphp2nflc7jtzrcazrra7wwgzxqc8u7754cdlpfrmccae92qgzqvzq2ps8pqqqqqqpqqqqq9qqqvpeuqafqxu92d8lr6fvg0r5gv0heeeqgcrqlnm6jhphu9y00rrhy4grqszsvpcgpy9qqqqqqgqqqqq7qqzqj9n4evl6mr5aj9f58zp6fyjzup6ywn3x6sk8akg5v4tgn2q8g4fhx05wf6juaxu9760yp46454gpg5mtzgerlzezqcqvjnhjh8z3g2qqpqa4j6",
//   });
// });

test("decodeLightningPayRequest", () => {
  const req =
    "lnbc10n1pjvmrrnpp5yydgk0802tlfukay0kr5alcy4dk6wukzwd9dss22m0xgvgf7szcqhp5rt66kqtmtcd0ruush32mpv9dlglqk07l3ncdssmwl05akmfl9gnqcqzzsxqzfvsp53saq4hkt8r05pes47fw838xuy0fs62xshuqrdx2z98th25cdrzns9qyyssqvrmgjzxkevx5dc6cgh9vkukt6jp7zwq6fepqun4z7z5xkwxd069rl768nm658vy6kdvp0qrjkhvf3swch7ycmfn9jgqjwm75cccalkqq50fkyj";
  const decoded = decodeLightnightPayRequest(req);
  console.log(decoded);
});
