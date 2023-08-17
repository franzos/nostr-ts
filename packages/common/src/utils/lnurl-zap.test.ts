import { isValidLnurlInvoiceResponse } from "..";

test("isValidLnurlInvoiceResponse", () => {
  const req = {
    relayUrls: ["https://stacker.news"],
    amount: 1000,
    recipientPubkey:
      "88d1163b882c0830bcca9319ffc0b3a7de2a13b173dd56d9dfff2b88aec4d3a5",
    lnurl: "lnurl1wpex7mt9w35x2atnwpshgun0dehkvurjdanxjazq0f3xgtn8vunf6sce",
  };
  const res = {
    pr: "lnbc10n1pjvmrrnpp5gs8f0lc0k4afrsdfn7uarfuyf3cr7csnegn6mwkk6s8uzkq9ldfqhp54338y02c9yjh6yqvadwvtsanpwhher2eecgs78nap9sl8hcgqx8qcqzzsxqzfvsp5knh27v599nmnuzgdkvgd67860n8hylacksd0hux888j00pevg0cq9qyyssqnmsh88k3ftnf5e745e4m206rt0n9knuawuthc8jwyf7cpqkaye4n0v9wgh2cgdn5m3ma6dqwfsys2mq9c22qy7jwc009xzqcmadqmdqp0ln2ge",
    disposable: null,
    routes: [],
    successAction: { tag: "message", message: "Thank you!" },
  };
  const isValid = isValidLnurlInvoiceResponse(req, res);
  expect(isValid).toBe(true);
});
