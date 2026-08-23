# ERC-8183 task adapter

This package models the task lifecycle used by the marketplace. It is intentionally separate from policy decisions: the task client stores task state, while the control plane decides whether a task may be funded, executed, completed, or frozen.
