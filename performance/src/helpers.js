window.benchmarkHelpers = {
  resolveWhenDone: async (
    waitForFirstCheck = null,
    verificationCheck = null,
  ) => {
    if (waitForFirstCheck) {
      await waitForFirstCheck
    }

    if (
      verificationCheck
      && !verificationCheck()
    ) {
      await new Promise(resolve => {
        const intervalId = setInterval(() => {
          if (verificationCheck()) {
            clearInterval(intervalId)
            resolve()
          }
        }, 0)
      })
    }
  },

  childNodesToObject: (
    node
  ) => {
    const abstractChildNodes = []
    for (let i = 0; i < node.childNodes.length; i++) {
      const childNode = node.childNodes[i]
      if (childNode instanceof Text) {
        abstractChildNodes.push(
          childNode.textContent ?? ''
        )
      } else {
        let attributes = {}
        for (let i = 0; i < childNode.attributes.length; i++) {
          const attribute = childNode.attributes[i]
          attributes[attribute.name] = attribute.value
        }

        abstractChildNodes.push({
          nodeName: childNode.nodeName,
          attributes: attributes,
          children: window.benchmarkHelpers.childNodesToObject(childNode),
        })
      }
    }
    return abstractChildNodes
  },
}

