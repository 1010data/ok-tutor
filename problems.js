[
	{
		title: "Level 1: First Steps"
		tests: [
			{
				name: "problem 1.1",
				prompt: "What will 1+2 evaluate to?",
				wants: "3",
				hints: {
					"2" : "You'll need to sum both numbers.",
					"42" : "Very funny, but still wrong."
					"12" : "The + operator is sum, not concatenate."
				}
			},
			{
				name: "problem 1.2",
				prompt: "Ok, how about 2+3*5?",
				wants: "17",
			},
			{
				name: "problem 1.3",
				prompt: "And what about 2*3+5?",
				wants: "16",
				hints: {
					"11" : "Expressions evaluate strictly right to left without obeying precedence.",
					"235" : "Numbers still aren't strings.",
				}
			},
		]
	},
]
